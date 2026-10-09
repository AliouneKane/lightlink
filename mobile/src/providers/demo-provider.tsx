import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import {
  createDemoRepository,
  type DemoRepository,
} from "../lib/demo-repository";
import { getNeighborhoods } from "../lib/energy";

const DemoContext = createContext<DemoRepository | null>(null);

export function DemoProvider({
  children,
  repository: injectedRepository,
}: PropsWithChildren<{ repository?: DemoRepository }>) {
  const [repository] = useState(
    () => injectedRepository ?? createDemoRepository(AsyncStorage),
  );
  useEffect(() => {
    void repository.hydrate();
  }, [repository]);

  return (
    <DemoContext.Provider value={repository}>{children}</DemoContext.Provider>
  );
}

export function useDemo() {
  const repository = useContext(DemoContext);
  if (!repository) throw new Error("useDemo must be used inside DemoProvider.");
  const snapshot = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  );
  const neighborhoods = useMemo(
    () => getNeighborhoods(snapshot.state.reports),
    [snapshot.state.reports],
  );

  return useMemo(
    () => ({
      ...snapshot,
      neighborhoods,
      report: repository.report,
      createOffer: repository.createOffer,
      requestOffer: repository.requestOffer,
      cancelRequest: repository.cancelRequest,
      setOfferAvailability: repository.setOfferAvailability,
      updateProfile: repository.updateProfile,
      setNotifications: repository.setNotifications,
      reset: repository.reset,
    }),
    [repository, snapshot, neighborhoods],
  );
}
