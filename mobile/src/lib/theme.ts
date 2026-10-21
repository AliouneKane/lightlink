import {
  BatteryCharging,
  CircleHelp,
  PlugZap,
  Sun,
  Zap,
  ZapOff,
} from "lucide-react-native";

export const darkColors = {
  canvas: "#121b22",
  surface: "#1d2c35",
  raised: "#2b3b47",
  soft: "#1b2730",
  ink: "#e9eef3",
  muted: "#b2bec8",
  line: "#33434d",
  green: "#8cdbb8",
  red: "#ffa99a",
  amber: "#f5d080",
  blue: "#9ec9f2",
  yellow: "#facb4c",
  navy: "#132d39",
  accent: "#facb4c",
};
export type Colors = typeof darkColors;
export const lightColors: Colors = {
  canvas: "#f5f7f8",
  surface: "#ffffff",
  raised: "#e9eef2",
  soft: "#eef2f4",
  ink: "#18313d",
  muted: "#52636f",
  line: "#d6dee4",
  green: "#26664f",
  red: "#a84535",
  amber: "#785813",
  blue: "#315f83",
  yellow: "#facb4c",
  navy: "#132d39",
  accent: "#785813",
};
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
};
export const statusMeta = {
  unknown: {
    label: "État inconnu",
    shortLabel: "Inconnu",
    color: "muted" as const,
    icon: CircleHelp,
  },
  powered: {
    label: "Courant disponible",
    shortLabel: "Avec courant",
    color: "green" as const,
    icon: Zap,
  },
  outage: {
    label: "Coupure signalée",
    shortLabel: "En coupure",
    color: "red" as const,
    icon: ZapOff,
  },
  unstable: {
    label: "Courant instable",
    shortLabel: "Instable",
    color: "amber" as const,
    icon: CircleHelp,
  },
};
export const sourceMeta = {
  solar: {
    label: "Solaire",
    shortLabel: "Solaire",
    color: "green" as const,
    icon: Sun,
  },
  generator: {
    label: "Générateur",
    shortLabel: "Générateur",
    color: "amber" as const,
    icon: PlugZap,
  },
  battery: {
    label: "Batterie",
    shortLabel: "Batterie",
    color: "blue" as const,
    icon: BatteryCharging,
  },
};
