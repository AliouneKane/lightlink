import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import {
  createDemoRepository,
  type DemoRepository,
  type OfferInput,
  type ReportInput,
} from "../lib/demo-repository";
import {
  applyLiveStatus,
  createLiveOffer,
  emptySharing,
  getNeighborhoods,
  loadSharing,
  reportLiveAbuse,
  requestLiveOffer,
  setLiveOfferOpen,
  setLiveRequestStatus,
  validateOffer,
  withoutLiveData,
  type RequestStatus,
  type SharingData,
} from "../lib/energy";
import {
  fetchLiveData,
  liveEnabled,
  sendLiveReport,
  sessionDb,
  subscribeToReports,
  type LiveData,
} from "../lib/live";
import {
  createReportQueue,
  type QueueSnapshot,
  type ReportQueue,
} from "../lib/report-queue";

/** "off": demo mode; "loading": first read pending; "error": no live data could be read. */
type LiveState = "off" | "loading" | "ready" | "error";

interface DemoContextValue {
  repository: DemoRepository;
  queue: ReportQueue | null;
  live: LiveData;
  liveState: LiveState;
  sharing: SharingData;
  sharingNotice: string | null;
  /** Runs a sharing action against Supabase, then reloads offers and requests. */
  runSharing: (action: (db: unknown) => Promise<string | null>) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);
const idleQueue: QueueSnapshot = { pending: 0, notice: null };
const noLiveData: LiveData = { zones: null, schedules: [], predictions: [] };

export function DemoProvider({
  children,
  repository: injectedRepository,
}: PropsWithChildren<{ repository?: DemoRepository }>) {
  const [repository] = useState(
    () => injectedRepository ?? createDemoRepository(AsyncStorage),
  );
  // Live mode only: reports also go to Supabase, through a queue that survives offline periods.
  const [queue] = useState(() =>
    liveEnabled && !injectedRepository
      ? createReportQueue(AsyncStorage, sendLiveReport)
      : null,
  );
  const [live, setLive] = useState<LiveData>(noLiveData);
  const [liveState, setLiveState] = useState<LiveState>(
    liveEnabled && !injectedRepository ? "loading" : "off",
  );
  // Phase 3, live mode: offers and requests come from Supabase, not from the phone.
  const [sharing, setSharing] = useState<SharingData>(emptySharing);
  const [sharingNotice, setSharingNotice] = useState<string | null>(null);
  const isLive = liveEnabled && !injectedRepository;
  const [refreshSharing] = useState(() => async () => {
    const db = await sessionDb();
    if (!db) return;
    const zone = repository.getSnapshot().state.profile.neighborhoodId;
    const data = await loadSharing(db, zone).catch(() => null);
    if (data) setSharing(data);
  });
  const [runSharing] = useState(
    () => (action: (db: unknown) => Promise<string | null>) => {
      setSharingNotice(null);
      void (async () => {
        const db = await sessionDb();
        const error = db
          ? await action(db).catch(() => "L’action n’a pas pu aboutir.")
          : "Pas de connexion. Réessayez quand le réseau revient.";
        setSharingNotice(error);
        await refreshSharing();
      })();
    },
  );

  useEffect(() => {
    void repository.hydrate();
  }, [repository]);

  useEffect(() => {
    if (!queue) return;
    void queue.load().then(() => queue.flush());
    const stopNetwork = NetInfo.addEventListener((network) => {
      if (network.isConnected) void queue.flush();
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void queue.flush();
    });
    return () => {
      stopNetwork();
      foreground.remove();
    };
  }, [queue]);

  useEffect(() => {
    if (!liveEnabled || injectedRepository) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void fetchLiveData()
          .catch(() => null)
          .then((data) => {
            if (data) {
              setLive(data);
              setLiveState("ready");
            } else {
              // Keep the last live data if there is some (PAN's review of #6).
              setLiveState((previous) =>
                previous === "ready" ? previous : "error",
              );
            }
          });
      }, 1000);
    };
    refresh();
    void refreshSharing();
    const stopRealtime = subscribeToReports(refresh);
    const minute = setInterval(() => {
      refresh();
      void refreshSharing();
    }, 60_000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(minute);
      stopRealtime();
    };
  }, [injectedRepository, refreshSharing]);

  const value = useMemo(
    () => ({
      repository,
      queue,
      live,
      liveState,
      sharing: isLive ? sharing : emptySharing,
      sharingNotice,
      runSharing,
    }),
    [
      repository,
      queue,
      live,
      liveState,
      isLive,
      sharing,
      sharingNotice,
      runSharing,
    ],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

const noQueue = {
  subscribe: () => () => {},
  getSnapshot: () => idleQueue,
};

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider.");
  const {
    repository,
    queue,
    live,
    liveState,
    sharing,
    sharingNotice,
    runSharing,
  } = context;
  const snapshot = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  );
  const source = queue ?? noQueue;
  const sync = useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getSnapshot,
  );
  // Live mode never shows demo states: until the database answers, zones are "unknown".
  const neighborhoods = useMemo(() => {
    const local = getNeighborhoods(snapshot.state.reports);
    if (live.zones) return applyLiveStatus(local, live.zones);
    return liveState === "loading" || liveState === "error"
      ? withoutLiveData(local, liveState)
      : local;
  }, [snapshot.state.reports, live.zones, liveState]);

  const isLiveMode = Boolean(queue);
  // Live mode: the screens read the offers and requests of the database.
  const state = useMemo(
    () =>
      isLiveMode
        ? {
            ...snapshot.state,
            offers: sharing.offers,
            bookings: sharing.bookings,
          }
        : snapshot.state,
    [isLiveMode, snapshot.state, sharing.offers, sharing.bookings],
  );

  return useMemo(
    () => ({
      ...snapshot,
      state,
      neighborhoods,
      liveEnabled: Boolean(queue),
      liveSchedules: live.schedules,
      livePredictions: live.predictions,
      sync,
      /** Saved on the phone at once; in live mode also sent to Supabase, now or when back online. */
      report(input: ReportInput): string | null {
        const error = repository.report(input);
        if (!error && queue)
          void queue.submit({ ...input, observedAt: new Date().toISOString() });
        return error;
      },
      incomingRequests: sharing.incoming,
      sharingNotice,
      createOffer(input: OfferInput & { address?: string }): string | null {
        if (!isLiveMode) return repository.createOffer(input);
        const error = validateOffer(input);
        if (error) return error;
        runSharing((db) =>
          createLiveOffer(db, input, snapshot.state.profile.name),
        );
        return null;
      },
      requestOffer(offerId: string): string | null {
        if (!isLiveMode) return repository.requestOffer(offerId);
        runSharing((db) => requestLiveOffer(db, offerId));
        return null;
      },
      cancelRequest(bookingId: string): void {
        if (!isLiveMode) return repository.cancelRequest(bookingId);
        runSharing((db) => setLiveRequestStatus(db, bookingId, "cancelled"));
      },
      setOfferAvailability(offerId: string, available: boolean): string | null {
        if (!isLiveMode)
          return repository.setOfferAvailability(offerId, available);
        runSharing((db) => setLiveOfferOpen(db, offerId, available));
        return null;
      },
      /** Host: accept, refuse or finish a request; requester: finish it. */
      answerRequest(requestId: string, status: RequestStatus): void {
        runSharing((db) => setLiveRequestStatus(db, requestId, status));
      },
      /** Task 90: report an abusive offer (live mode). */
      reportAbuse(offerId: string, reason: string): void {
        runSharing((db) => reportLiveAbuse(db, offerId, reason));
      },
      updateProfile: repository.updateProfile,
      setNotifications: repository.setNotifications,
      reset: repository.reset,
    }),
    [
      repository,
      queue,
      snapshot,
      state,
      isLiveMode,
      sharing.incoming,
      sharingNotice,
      runSharing,
      neighborhoods,
      live.schedules,
      live.predictions,
      sync,
    ],
  );
}
