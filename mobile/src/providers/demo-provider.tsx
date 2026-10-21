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
  type ReportInput,
} from "../lib/demo-repository";
import {
  applyLiveStatus,
  getNeighborhoods,
  withoutLiveData,
} from "../lib/energy";
import {
  fetchLiveData,
  liveEnabled,
  sendLiveReport,
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
    const stopRealtime = subscribeToReports(refresh);
    const minute = setInterval(refresh, 60_000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(minute);
      stopRealtime();
    };
  }, [injectedRepository]);

  const value = useMemo(
    () => ({ repository, queue, live, liveState }),
    [repository, queue, live, liveState],
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
  const { repository, queue, live, liveState } = context;
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

  return useMemo(
    () => ({
      ...snapshot,
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
      createOffer: repository.createOffer,
      requestOffer: repository.requestOffer,
      cancelRequest: repository.cancelRequest,
      setOfferAvailability: repository.setOfferAvailability,
      updateProfile: repository.updateProfile,
      setNotifications: repository.setNotifications,
      reset: repository.reset,
    }),
    [
      repository,
      queue,
      snapshot,
      neighborhoods,
      live.schedules,
      live.predictions,
      sync,
    ],
  );
}
