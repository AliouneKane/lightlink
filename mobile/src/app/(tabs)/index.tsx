import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Plus,
  Radio,
  Zap,
  ZapOff,
} from "lucide-react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";
import { getOffers, formatTime } from "@/lib/energy";
import { statusMeta } from "@/lib/theme";
import { getForecast } from "@/lib/forecast";
import {
  Card,
  DemoNote,
  IconButton,
  OfferCard,
  Screen,
  SectionTitle,
  StorageNotice,
  Txt,
  ZonePicker,
  feedback,
} from "@/components/ui";

function Mark() {
  return (
    <Svg width={31} height={31} viewBox="0 0 48 48">
      <Rect width={48} height={48} rx={14} fill="#facb4c" />
      <Path d="M27.2 8 13 26h10l-2.2 14L35 22H25l2.2-14Z" fill="#132d39" />
      <Path
        d="m12 15-4 5m32 9-4 5"
        stroke="#132d39"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
export default function Home() {
  const { state, neighborhoods, updateProfile, livePredictions } = useDemo();
  const { colors } = useTheme();
  const zone = neighborhoods.find(
    (item) => item.id === state.profile.neighborhoodId,
  )!;
  const forecast = getForecast(zone.id, livePredictions);
  const offers = getOffers(state.offers, zone.id, "all", "");
  const reports = [...state.reports]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 3);
  const powered = zone.status === "powered";
  const headline = powered
    ? "Le courant est là."
    : zone.status === "outage"
      ? `Coupure à ${zone.name}`
      : "Le courant est instable.";
  const initials = state.profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <Screen>
      <View style={styles.topbar}>
        <Mark />
        <Txt
          size={19}
          weight="extrabold"
          style={{ flex: 1, letterSpacing: -0.6 }}
        >
          LightLink
          <Txt size={19} tone="accent">
            .
          </Txt>
        </Txt>
        <IconButton
          icon={ClipboardList}
          label={`Mes demandes${state.bookings.length ? ` · ${state.bookings.length} en attente` : ""}`}
          onPress={() =>
            router.push({
              pathname: "/profil",
              params: { section: "demandes" },
            })
          }
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir mon profil"
          onPress={() => router.push("/profil")}
          style={({ pressed }) => [
            styles.avatar,
            {
              backgroundColor: colors.raised,
              borderColor: colors.line,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Txt size={13} weight="extrabold">
            {initials}
          </Txt>
        </Pressable>
      </View>
      <View style={{ gap: 5 }}>
        <Txt size={12} tone="muted">
          Bonjour {state.profile.name} 👋
        </Txt>
        <Txt
          size={32}
          weight="extrabold"
          accessibilityRole="header"
          style={{ lineHeight: 39, letterSpacing: -1.3 }}
        >
          L’énergie nous
          <Txt
            size={32}
            weight="extrabold"
            style={{ color: colors.accent, lineHeight: 39 }}
          >
            {"\n"}rapproche.
          </Txt>
        </Txt>
      </View>
      <View style={styles.locationRow}>
        <View style={{ flex: 1 }}>
          <ZonePicker
            label="Changer mon quartier"
            value={zone.id}
            onChange={(neighborhoodId) =>
              updateProfile({ ...state.profile, neighborhoodId })
            }
          />
        </View>
        <View style={{ gap: 5 }}>
          <Txt
            size={10}
            weight="bold"
            tone="muted"
            style={{ letterSpacing: 1.3 }}
          >
            ACCRA, GH
          </Txt>
          <View style={styles.row}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
            <Txt size={10} tone="muted">
              Zone pilote
            </Txt>
          </View>
        </View>
      </View>
      <StorageNotice />
      <View style={[styles.hero, { backgroundColor: colors.yellow }]}>
        <View
          style={[styles.row, { justifyContent: "space-between", zIndex: 1 }]}
        >
          <View style={[styles.row, { gap: 6 }]}>
            <Radio size={14} color="#132d39" />
            <Txt
              size={10}
              weight="extrabold"
              style={{ color: "#132d39", letterSpacing: 1.1 }}
            >
              VOTRE QUARTIER · DÉMO
            </Txt>
          </View>
          <ArrowDownRight size={20} color="#132d39" />
        </View>
        <View style={styles.heroScene}>
          <Image
            source={require("../../../assets/neighborhood-hero.webp")}
            contentFit="contain"
            style={styles.neighborhoodArt}
            accessibilityLabel="Illustration de maisons reliées par l’entraide et l’énergie solaire"
            transition={0}
          />
          <View style={styles.heroCopy}>
            <Txt
              size={25}
              weight="extrabold"
              style={{ color: "#132d39", lineHeight: 31, letterSpacing: -0.8 }}
            >
              {headline}
            </Txt>
            <Txt
              size={12}
              weight="medium"
              style={{ color: "#34442d", lineHeight: 19 }}
            >
              {powered
                ? "Votre énergie peut aider un voisin."
                : "L’entraide, elle, reste allumée."}
            </Txt>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            powered ? "Partager mon énergie" : "Trouver de l’énergie"
          }
          onPress={() => {
            feedback();
            router.push(
              powered
                ? "/publier"
                : { pathname: "/partage", params: { zone: zone.id } },
            );
          }}
          style={({ pressed }) => [
            styles.heroButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Zap size={18} color="#facb4c" />
          <Txt size={14} weight="bold" style={{ color: "#fff", flex: 1 }}>
            {powered ? "Partager mon énergie" : "Trouver de l’énergie"}
          </Txt>
          <ArrowUpRight size={21} color="#facb4c" />
        </Pressable>
      </View>
      <View style={styles.quickActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Signaler"
          onPress={() => {
            feedback();
            router.push("/signaler");
          }}
          style={({ pressed }) => [
            styles.quickAction,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View
              style={[styles.quickIcon, { backgroundColor: colors.red + "16" }]}
            >
              <ZapOff size={20} color={colors.red} />
            </View>
            <ArrowUpRight size={17} color={colors.muted} />
          </View>
          <View>
            <Txt weight="bold" size={15}>
              Signaler
            </Txt>
            <Txt size={11} tone="muted">
              En un petit geste
            </Txt>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager"
          onPress={() => {
            feedback();
            router.push("/publier");
          }}
          style={({ pressed }) => [
            styles.quickAction,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: colors.green + "16" },
              ]}
            >
              <Plus size={21} color={colors.green} />
            </View>
            <ArrowUpRight size={17} color={colors.muted} />
          </View>
          <View>
            <Txt weight="bold" size={15}>
              Partager
            </Txt>
            <Txt size={11} tone="muted">
              Une source, un lien
            </Txt>
          </View>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Consulter les prévisions"
        onPress={() =>
          router.push({ pathname: "/previsions", params: { zone: zone.id } })
        }
        style={({ pressed }) => [
          styles.forecast,
          { backgroundColor: colors.soft, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={13} weight="bold">
            Un temps d’avance.
          </Txt>
          <Txt size={11} tone="muted">
            {zone.reports} signalements · démo
          </Txt>
        </View>
        <View style={[styles.row, { gap: 3, alignItems: "flex-end" }]}>
          {forecast.riskValues.map((risk, i) => (
            <View
              key={i}
              style={{
                height: Math.max(5, risk * 0.46),
                width: 4,
                borderRadius: 3,
                backgroundColor:
                  i >= forecast.peakStartIndex && i <= forecast.peakEndIndex
                    ? colors.accent
                    : colors.line,
              }}
            />
          ))}
        </View>
        <ChevronRight size={19} color={colors.muted} />
      </Pressable>
      <View style={{ gap: 12 }}>
        <SectionTitle
          title="Les bonnes énergies"
          action="Tout voir"
          onPress={() =>
            router.push({ pathname: "/partage", params: { zone: zone.id } })
          }
        />
        <Txt tone="muted" size={12}>
          À deux pas, un voisin peut faire la différence.
        </Txt>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={282}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 14, paddingVertical: 2 }}
        >
          {offers.slice(0, 4).map((offer) => (
            <OfferCard
              key={offer.id}
              compact
              offer={offer}
              onPress={() =>
                router.push({
                  pathname: "/offre/[id]",
                  params: { id: offer.id, zone: zone.id },
                })
              }
            />
          ))}
        </ScrollView>
        {offers.length === 0 && (
          <Card>
            <Txt weight="bold">Aucune offre disponible pour le moment.</Txt>
            <Txt tone="muted">Votre source pourrait être la première.</Txt>
          </Card>
        )}
      </View>
      <View style={{ gap: 13 }}>
        <SectionTitle
          title="Le quartier s’active"
          action="Le fil"
          onPress={() => router.push("/communaute")}
        />
        {reports.map((report) => {
          const meta = statusMeta[report.status];
          return (
            <View
              key={report.id}
              style={[styles.activity, { borderBottomColor: colors.line }]}
            >
              <View
                style={[
                  styles.activityAvatar,
                  { backgroundColor: colors[meta.color] + "18" },
                ]}
              >
                <meta.icon size={18} color={colors[meta.color]} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={13} weight="bold">
                  {
                    neighborhoods.find(
                      (item) => item.id === report.neighborhoodId,
                    )?.name
                  }{" "}
                  · {meta.shortLabel}
                </Txt>
                <Txt size={11} tone="muted">
                  {report.author} ·{" "}
                  {new Date(report.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    timeZone: "Africa/Accra",
                  })}{" "}
                  à {formatTime(report.createdAt)} GMT
                </Txt>
              </View>
            </View>
          );
        })}
      </View>
      <DemoNote />
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  hero: { borderRadius: 28, padding: 18, overflow: "hidden" },
  heroScene: { minHeight: 181, justifyContent: "center" },
  heroCopy: { width: "46%", gap: 10, paddingVertical: 10, zIndex: 1 },
  neighborhoodArt: {
    position: "absolute",
    width: "67%",
    height: 215,
    right: -42,
    top: -7,
  },
  heroButton: {
    minHeight: 53,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#132d39",
  },
  quickActions: { flexDirection: "row", gap: 12 },
  quickAction: {
    flex: 1,
    padding: 16,
    borderRadius: 23,
    borderWidth: 1,
    gap: 12,
  },
  quickIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  forecast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 19,
    padding: 16,
    gap: 18,
  },
  activity: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityAvatar: {
    width: 41,
    height: 41,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
