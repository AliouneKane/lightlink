import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { darkColors, lightColors, type Colors } from "@/lib/theme";

type Mode = "dark" | "light";
const key = "lightlink.mobile.display.v1";
const ThemeContext = createContext<{
  colors: Colors;
  mode: Mode;
  setMode: (mode: Mode) => void;
  resetTheme: () => void;
  ready: boolean;
}>({
  colors: darkColors,
  mode: "dark",
  setMode: () => {},
  resetTheme: () => {},
  ready: false,
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, updateMode] = useState<Mode>("dark");
  const [ready, setReady] = useState(false);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        if (
          active &&
          !changed.current &&
          (value === "light" || value === "dark")
        )
          updateMode(value);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const setMode = (value: Mode) => {
    changed.current = true;
    updateMode(value);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(key, value))
      .catch(() => {});
  };
  return (
    <ThemeContext.Provider
      value={{
        colors: mode === "dark" ? darkColors : lightColors,
        mode,
        setMode,
        resetTheme: () => setMode("dark"),
        ready,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
