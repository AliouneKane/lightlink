import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Circle, Marker, type Region } from "react-native-maps";
import {
  ChevronRight,
  Layers,
  Map,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react-native";
import { PLANNED_COLOR, statusMeta } from "@/lib/theme";
import { useTheme } from "@/providers/theme-provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Txt } from "./ui";
import type { NeighborhoodMapProps } from "./neighborhood-map";

class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function NeighborhoodMap(props: NeighborhoodMapProps) {
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<"map" | "list">("map");
  const retry = () => setAttempt((value) => value + 1);
  return (
    <View style={{ minHeight: props.height ?? 330 }}>
      <View
        pointerEvents={mode === "map" ? "auto" : "none"}
        accessibilityElementsHidden={mode !== "map"}
        importantForAccessibility={
          mode === "map" ? "auto" : "no-hide-descendants"
        }
        style={
          mode === "list"
            ? { position: "absolute", width: "100%", opacity: 0 }
            : undefined
        }
      >
        <MapErrorBoundary
          key={attempt}
          fallback={<MapFallback {...props} retry={retry} />}
        >
          <NativeMap
            key={attempt}
            {...props}
            retry={retry}
            onShowList={() => setMode("list")}
          />
        </MapErrorBoundary>
      </View>
      {mode === "list" && (
        <MapFallback {...props} reason="choice" retry={() => setMode("map")} />
      )}
    </View>
  );
}

function MapFallback({
  neighborhoods,
  selectedId,
  onSelect,
  height = 330,
  retry,
  reason = "error",
}: NeighborhoodMapProps & { retry: () => void; reason?: "error" | "choice" }) {
  const { colors } = useTheme();
  const ReturnIcon = reason === "error" ? RotateCcw : Map;
  return (
    <View
      style={[
        styles.frame,
        {
          minHeight: height,
          backgroundColor: colors.soft,
          borderColor: colors.line,
          padding: 18,
          gap: 13,
        },
      ]}
    >
      <View style={styles.row}>
        <MapPin size={22} color={colors.accent} />
        <Txt weight="bold" size={16} style={{ flex: 1 }}>
          {reason === "error"
            ? "Les quartiers restent accessibles"
            : "Les quartiers en un regard"}
        </Txt>
      </View>
      <Txt size={12} tone="muted" accessibilityLiveRegion="polite">
        {reason === "error"
          ? "Le fond de carte n’a pas pu se charger. Les informations locales restent disponibles."
          : "Choisissez un quartier pour consulter son état et les offres proches."}
      </Txt>
      <ScrollView
        style={{ maxHeight: Math.max(130, height - 170) }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {neighborhoods.map((area) => (
          <Pressable
            key={area.id}
            accessibilityRole="button"
            accessibilityLabel={`${area.name}, ${statusMeta[area.status].label}`}
            accessibilityState={{ selected: selectedId === area.id }}
            onPress={() => onSelect(area.id)}
            style={[styles.fallbackRow, { borderColor: colors.line }]}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors[statusMeta[area.status].color],
              }}
            />
            <View style={{ flex: 1 }}>
              <Txt
                size={13}
                weight={selectedId === area.id ? "extrabold" : "medium"}
              >
                {area.name}
              </Txt>
              <Txt size={10} tone="muted">
                {statusMeta[area.status].label}
              </Txt>
            </View>
            <ChevronRight size={17} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          reason === "error"
            ? "Réessayer de charger la carte"
            : "Revenir à la carte"
        }
        onPress={retry}
        style={[styles.retry, { backgroundColor: colors.surface }]}
      >
        <ReturnIcon size={16} color={colors.accent} />
        <Txt size={12} weight="bold" tone="accent">
          {reason === "error" ? "Réessayer la carte" : "Revenir à la carte"}
        </Txt>
      </Pressable>
    </View>
  );
}

function NativeMap({
  neighborhoods,
  selectedId,
  onSelect,
  height = 330,
  retry,
  onShowList,
}: NeighborhoodMapProps & { retry: () => void; onShowList: () => void }) {
  const { colors, mode } = useTheme();
  const reducedMotion = useReducedMotion();
  const map = useRef<MapView>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const selected = neighborhoods.find((area) => area.id === selectedId);
  const latitude = selected?.lat;
  const longitude = selected?.lng;
  const [initialRegion] = useState<Region>(() => ({
    latitude: latitude ?? 5.59,
    longitude: longitude ?? -0.205,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  }));
  const region = useRef<Region>(initialRegion);

  useEffect(() => {
    if (status !== "loading") return;
    const timeout = setTimeout(() => setStatus("unavailable"), 12000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || latitude === undefined || longitude === undefined)
      return;
    const next = { ...region.current, latitude, longitude };
    region.current = next;
    map.current?.animateToRegion(next, reducedMotion ? 0 : 250);
  }, [latitude, longitude, status, reducedMotion]);

  const zoom = (scale: number) => {
    if (status !== "ready") return;
    const current = region.current;
    const next = {
      ...current,
      latitudeDelta: Math.max(
        0.004,
        Math.min(0.6, current.latitudeDelta * scale),
      ),
      longitudeDelta: Math.max(
        0.004,
        Math.min(0.6, current.longitudeDelta * scale),
      ),
    };
    region.current = next;
    map.current?.animateToRegion(next, reducedMotion ? 0 : 200);
  };
  function showAll() {
    if (status !== "ready" || neighborhoods.length === 0) return;
    map.current?.fitToCoordinates(
      neighborhoods.map((area) => ({
        latitude: area.lat,
        longitude: area.lng,
      })),
      {
        edgePadding: { top: 65, right: 55, bottom: 48, left: 35 },
        animated: !reducedMotion,
      },
    );
  }

  if (status === "unavailable")
    return (
      <MapFallback
        neighborhoods={neighborhoods}
        selectedId={selectedId}
        onSelect={onSelect}
        height={height}
        retry={retry}
      />
    );

  return (
    <View
      style={[
        styles.frame,
        { height, borderColor: colors.line, backgroundColor: colors.soft },
      ]}
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        userInterfaceStyle={mode}
        customMapStyle={
          mode === "dark"
            ? [
                { elementType: "geometry", stylers: [{ color: colors.soft }] },
                {
                  elementType: "labels.text.fill",
                  stylers: [{ color: colors.muted }],
                },
                {
                  elementType: "labels.text.stroke",
                  stylers: [{ color: colors.soft }],
                },
                {
                  featureType: "road",
                  elementType: "geometry",
                  stylers: [{ color: colors.line }],
                },
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [{ color: colors.navy }],
                },
                { featureType: "poi", stylers: [{ visibility: "off" }] },
              ]
            : []
        }
        onMapReady={() => {
          if (Platform.OS === "ios") setStatus("ready");
        }}
        onMapLoaded={() => setStatus("ready")}
        onRegionChangeComplete={(value) => {
          region.current = value;
        }}
        loadingEnabled
        loadingIndicatorColor={colors.accent}
        loadingBackgroundColor={colors.soft}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomControlEnabled={false}
        accessibilityLabel="Carte des quartiers pilotes d’Accra. Une liste accessible est disponible avec le bouton Liste."
      >
        {neighborhoods.map((area) => {
          const active = area.id === selectedId;
          const color = colors[statusMeta[area.status].color];
          return (
            <Circle
              key={`circle-${area.id}`}
              center={{ latitude: area.lat, longitude: area.lng }}
              radius={active ? 350 : 230}
              fillColor={`${color}22`}
              // Task 67: ECG outage announced right now (dashed ring).
              strokeColor={area.plannedUntil ? PLANNED_COLOR : `${color}55`}
              strokeWidth={area.plannedUntil ? 2 : 1}
              lineDashPattern={area.plannedUntil ? [6, 6] : undefined}
            />
          );
        })}
        {neighborhoods.map((area) => (
          <Marker
            key={`${area.id}-${mode}-${area.status}`}
            identifier={area.id}
            coordinate={{ latitude: area.lat, longitude: area.lng }}
            title={area.name}
            description={
              area.plannedUntil
                ? `${statusMeta[area.status].label} · coupure annoncée par l’ECG jusqu’à ${area.plannedUntil.slice(11, 16)}`
                : statusMeta[area.status].label
            }
            pinColor={colors[statusMeta[area.status].color]}
            onPress={() => onSelect(area.id)}
            accessibilityLabel={`${area.name}, ${statusMeta[area.status].label}`}
          />
        ))}
      </MapView>
      <View
        pointerEvents="none"
        style={[styles.location, { backgroundColor: colors.surface }]}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.green,
          }}
        />
        <Txt size={10} weight="extrabold" style={{ letterSpacing: 1.4 }}>
          ACCRA, GHANA
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Afficher les quartiers en liste"
        onPress={onShowList}
        style={[styles.listButton, { backgroundColor: colors.surface }]}
      >
        <Layers size={16} color={colors.ink} />
        <Txt size={10} weight="bold">
          Liste
        </Txt>
      </Pressable>
      <View
        style={[
          styles.controls,
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        {[
          { icon: Plus, label: "Zoom avant", factor: 0.6 },
          { icon: Minus, label: "Zoom arrière", factor: 1.65 },
          {
            icon: Maximize2,
            label: "Afficher tous les quartiers",
            factor: 0,
          },
        ].map(({ icon: Icon, label, factor }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: status !== "ready" }}
            disabled={status !== "ready"}
            onPress={() => {
              if (factor === 0) showAll();
              else zoom(factor);
            }}
            style={({ pressed }) => [
              styles.control,
              { opacity: status !== "ready" ? 0.35 : pressed ? 0.5 : 1 },
            ]}
          >
            <Icon size={18} color={colors.ink} />
          </Pressable>
        ))}
      </View>
      {status === "loading" && (
        <View
          pointerEvents="none"
          style={[styles.loading, { backgroundColor: colors.surface }]}
        >
          <ActivityIndicator size="small" color={colors.accent} />
          <Txt size={11} accessibilityLiveRegion="polite">
            Chargement de la carte…
          </Txt>
        </View>
      )}
    </View>
  );
}

export default NeighborhoodMap;

const styles = StyleSheet.create({
  frame: { borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  fallbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 54,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
  },
  location: {
    position: "absolute",
    top: 15,
    left: 15,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    padding: 10,
    borderRadius: 11,
  },
  listButton: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  controls: {
    position: "absolute",
    right: 12,
    bottom: 34,
    borderWidth: 1,
    borderRadius: 13,
    overflow: "hidden",
  },
  control: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: {
    position: "absolute",
    left: 15,
    bottom: 34,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 11,
    borderRadius: 11,
  },
});
