import { useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  ListFilter,
  MapPin,
  MessageCircle,
  Search,
  Zap,
} from "lucide-react-native";
import {
  Button,
  Card,
  Chips,
  DemoNote,
  Field,
  IconButton,
  Screen,
  SectionTitle,
  StatusPill,
  Txt,
} from "@/components/ui";
import { NeighborhoodMap } from "@/components/neighborhood-map";
import { formatTime, isOutageForFilter } from "@/lib/energy";
import { statusMeta } from "@/lib/theme";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .trim();

export default function MapScreen() {
  const { state, neighborhoods } = useDemo();
  const params = useLocalSearchParams<{ zone?: string | string[] }>();
  const requestedZone = Array.isArray(params.zone)
    ? params.zone[0]
    : params.zone;
  const validRequestedZone = neighborhoods.some(
    (area) => area.id === requestedZone,
  )
    ? requestedZone
    : undefined;
  const destination = validRequestedZone ?? state.profile.neighborhoodId;
  // Navigating to a new destination resets incompatible retained filters.
  return <MapExplorer key={destination} initialSelectedId={destination} />;
}

function MapExplorer({ initialSelectedId }: { initialSelectedId: string }) {
  const { state, neighborhoods } = useDemo();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const detailY = useRef(0);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);

  const visible = useMemo(
    () =>
      neighborhoods.filter(
        (area) =>
          (filter === "all" ||
            area.status === filter ||
            (filter === "outage" && isOutageForFilter(area))) &&
          normalize(area.name).includes(normalize(query)),
      ),
    [neighborhoods, filter, query],
  );

  const selected = visible.find((area) => area.id === selectedId) ?? visible[0];
  const offers = selected
    ? state.offers.filter(
        (offer) =>
          offer.neighborhoodId === selected.id &&
          offer.available &&
          offer.slots > 0,
      )
    : [];
  const latestReport = selected
    ? state.reports
        .filter((report) => report.neighborhoodId === selected.id)
        .sort(
          (first, second) =>
            Date.parse(second.createdAt) - Date.parse(first.createdAt),
        )[0]
    : undefined;

  function revealDetails() {
    scrollRef.current?.scrollTo({
      y: Math.max(0, detailY.current - 12),
      animated: !reducedMotion,
    });
  }
  const chooseArea = (id: string, reveal = true) => {
    setSelectedId(id);
    const area = neighborhoods.find((item) => item.id === id);
    if (area && Platform.OS !== "web")
      AccessibilityInfo.announceForAccessibility(
        `${area.name}. ${statusMeta[area.status].label}.`,
      );
    if (reveal) requestAnimationFrame(revealDetails);
  };

  const selectedActions = selected && (
    <View style={[styles.row, { gap: 10 }]}>
      <View style={{ flex: 1 }}>
        <Button
          label="Report"
          icon={MessageCircle}
          onPress={() =>
            router.push({
              pathname: "/signaler",
              params: { zone: selected.id },
            })
          }
        />
      </View>
      <View style={{ flex: 1 }}>
        <Button
          label="View offers"
          icon={Zap}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/partage", params: { zone: selected.id } })
          }
        />
      </View>
    </View>
  );

  return (
    <Screen
      title="Neighbourhood map"
      subtitle="Accra, Ghana · the energy around you"
      scrollRef={scrollRef}
      action={
        <IconButton
          icon={Search}
          label={
            searchOpen
              ? "Hide the neighbourhood search"
              : "Search a neighbourhood"
          }
          onPress={() => setSearchOpen((value) => !value)}
        />
      }
    >
      <View style={{ gap: 12 }}>
        {(searchOpen || query !== "") && (
          <View style={{ position: "relative" }}>
            <Field
              label="Search a neighbourhood"
              value={query}
              onChangeText={setQuery}
              placeholder="Osu, Madina, Labone…"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={{ paddingLeft: 42 }}
            />
            <Search
              pointerEvents="none"
              size={18}
              color={colors.muted}
              style={{ position: "absolute", left: 14, bottom: 16 }}
            />
          </View>
        )}
        <Chips
          options={[
            { value: "all", label: "All", icon: ListFilter },
            {
              value: "powered",
              label: "Power on",
              icon: statusMeta.powered.icon,
            },
            {
              value: "outage",
              label: "Outages",
              icon: statusMeta.outage.icon,
            },
            {
              value: "unstable",
              label: "Unstable",
              icon: statusMeta.unstable.icon,
            },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <View style={{ gap: 12 }}>
        <View style={styles.row}>
          <Txt size={12} weight="bold" style={{ flex: 1 }}>
            {visible.length} pilot neighbourhood
            {visible.length === 1 ? "" : "s"}
          </Txt>
          <View style={[styles.demoBadge, { backgroundColor: colors.soft }]}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
            <Txt size={10} weight="bold" tone="muted">
              DEMO
            </Txt>
          </View>
        </View>
        {visible.length > 0 ? (
          <NeighborhoodMap
            neighborhoods={visible}
            selectedId={selected?.id ?? selectedId}
            onSelect={chooseArea}
            height={Math.max(
              320,
              Math.min(420, Math.round(windowHeight * 0.48)),
            )}
          />
        ) : (
          <Card>
            <MapPin size={28} color={colors.muted} />
            <Txt size={16} weight="bold">
              No neighbourhood found
            </Txt>
            <Txt size={13} tone="muted">
              Try another name or show every power status.
            </Txt>
            <Button
              label="Reset filters"
              variant="secondary"
              onPress={() => {
                setQuery("");
                setFilter("all");
              }}
            />
          </Card>
        )}
        <View style={[styles.row, { flexWrap: "wrap", gap: 15 }]}>
          {(["powered", "outage", "unstable"] as const).map((status) => (
            <View key={status} style={[styles.row, { gap: 5 }]}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: colors[statusMeta[status].color],
                }}
              />
              <Txt size={10} tone="muted">
                {statusMeta[status].shortLabel}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {selected && (
        <View
          onLayout={({ nativeEvent }) => {
            detailY.current = nativeEvent.layout.y;
          }}
        >
          <Card
            style={{
              borderColor: `${colors[statusMeta[selected.status].color]}70`,
            }}
          >
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt
                  size={10}
                  weight="bold"
                  tone="muted"
                  style={{ letterSpacing: 1.5 }}
                >
                  SELECTED NEIGHBOURHOOD
                </Txt>
                <Txt size={23} weight="extrabold" accessibilityRole="header">
                  {selected.name}
                </Txt>
              </View>
              <View
                style={[
                  styles.areaIcon,
                  {
                    backgroundColor: `${colors[statusMeta[selected.status].color]}14`,
                  },
                ]}
              >
                <MapPin
                  size={22}
                  color={colors[statusMeta[selected.status].color]}
                />
              </View>
            </View>
            <StatusPill status={selected.status} />
            <View style={[styles.row, { alignItems: "flex-start" }]}>
              <Clock3 size={16} color={colors.muted} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={13} weight="medium">
                  {selected.restoration}
                </Txt>
                <Txt size={11} tone="muted">
                  {latestReport
                    ? `Demo report · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" }).format(new Date(latestReport.createdAt))} at ${formatTime(latestReport.createdAt)} GMT`
                    : "Local scenario status"}
                </Txt>
              </View>
            </View>
            <View
              style={[
                styles.row,
                {
                  borderTopWidth: 1,
                  borderTopColor: colors.line,
                  paddingTop: 15,
                  gap: 20,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={23} weight="extrabold">
                  {selected.reports}
                </Txt>
                <Txt size={11} tone="muted">
                  demo reports
                </Txt>
              </View>
              <View
                style={{ width: 1, height: 36, backgroundColor: colors.line }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={23} weight="extrabold">
                  {offers.length}
                </Txt>
                <Txt size={11} tone="muted">
                  local energy offer{offers.length === 1 ? "" : "s"}
                </Txt>
              </View>
            </View>
            {selectedActions}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View the forecast for ${selected.name}`}
              onPress={() =>
                router.push({
                  pathname: "/previsions",
                  params: { zone: selected.id },
                })
              }
              style={[styles.row, { minHeight: 44, justifyContent: "center" }]}
            >
              <Txt size={12} weight="bold" tone="accent">
                View the forecast
              </Txt>
              <ArrowUpRight size={15} color={colors.accent} />
            </Pressable>
          </Card>
        </View>
      )}

      {visible.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionTitle title="Explore the neighbourhoods" />
          <View
            style={{
              borderRadius: 19,
              borderWidth: 1,
              borderColor: colors.line,
              overflow: "hidden",
              backgroundColor: colors.surface,
            }}
          >
            {visible.map((area, index) => (
              <Pressable
                key={area.id}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${area.name}, ${statusMeta[area.status].label}, ${area.reports} demo reports`}
                accessibilityState={{ selected: area.id === selected?.id }}
                onPress={() => chooseArea(area.id, true)}
                style={({ pressed }) => [
                  styles.areaRow,
                  {
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderColor: colors.line,
                    backgroundColor:
                      area.id === selected?.id
                        ? `${colors[statusMeta[area.status].color]}0D`
                        : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: colors[statusMeta[area.status].color],
                  }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt size={14} weight="bold">
                    {area.name}
                  </Txt>
                  <Txt size={11} tone="muted">
                    {statusMeta[area.status].label}
                  </Txt>
                </View>
                <Txt size={11} tone="muted">
                  {area.reports}
                </Txt>
                <ChevronRight
                  size={17}
                  color={
                    area.id === selected?.id ? colors.accent : colors.muted
                  }
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <DemoNote text="Simulated statuses and reports. Dots show approximate neighbourhood centres, never a private address." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  footerPin: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailButton: {
    minHeight: 44,
    minWidth: 54,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  areaIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  areaRow: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
