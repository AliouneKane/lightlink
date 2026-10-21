import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { Check, Compass, Maximize2, Minus, Plus, X } from "lucide-react-native";
import type { Neighborhood } from "@/lib/energy";
import { PLANNED_COLOR, statusMeta } from "@/lib/theme";
import { useTheme } from "@/providers/theme-provider";
import { Txt } from "./ui";

export interface NeighborhoodMapProps {
  neighborhoods: Neighborhood[];
  selectedId: string;
  onSelect: (id: string) => void;
  height?: number;
}

const WIDTH = 560;
const HEIGHT = 380;
// The schematic preserves the neighbourhood centres' relative positions.
// Roads and the coastline are original decorative paths, not geographic data.
const project = (area: Neighborhood) => ({
  x: 45 + ((area.lng + 0.285) / 0.305) * 470,
  y: 65 + ((5.69 - area.lat) / 0.155) * 260,
});
const roads = [
  "M -30 82 C 94 56 166 103 266 114 S 434 147 592 89",
  "M -20 193 C 116 152 184 163 266 205 S 418 247 579 179",
  "M -10 286 C 90 221 187 244 262 270 S 433 289 576 255",
  "M 71 -18 C 81 80 128 149 149 218 S 164 299 190 353",
  "M 198 -10 C 185 74 234 155 235 219 S 269 288 291 342",
  "M 320 -5 C 292 74 323 139 342 213 S 361 270 412 335",
  "M 460 -15 C 410 93 410 151 450 234 S 518 279 544 333",
];

type MapPoint = { area: Neighborhood; x: number; y: number };
type MapGroup = { points: MapPoint[]; x: number; y: number };
// Group overlapping touch targets without changing the actual point coordinates.
function groupPoints(points: MapPoint[]): MapGroup[] {
  const groups = points.map((point) => ({
    points: [point],
    x: point.x,
    y: point.y,
  }));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let first = 0; first < groups.length; first++)
      for (let second = first + 1; second < groups.length; second++) {
        const a = groups[first],
          b = groups[second];
        const nearby = a.points.some((one) =>
          b.points.some(
            (two) =>
              Math.abs(one.x - two.x) < 52 && Math.abs(one.y - two.y) < 52,
          ),
        );
        if (!nearby && (Math.abs(a.x - b.x) >= 52 || Math.abs(a.y - b.y) >= 52))
          continue;
        const joined = [...a.points, ...b.points];
        groups[first] = {
          points: joined,
          x: joined.reduce((sum, p) => sum + p.x, 0) / joined.length,
          y: joined.reduce((sum, p) => sum + p.y, 0) / joined.length,
        };
        groups.splice(second, 1);
        merged = true;
        break outer;
      }
  }
  return groups;
}

/** Browser preview: deliberately labelled schematic; native uses MapView. */
export function NeighborhoodMap({
  neighborhoods,
  selectedId,
  onSelect,
  height = 330,
}: NeighborhoodMapProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 320, height });
  const [openIds, setOpenIds] = useState<string[]>([]);
  const selected = neighborhoods.find((area) => area.id === selectedId);
  const focus = selected ? project(selected) : { x: WIDTH / 2, y: HEIGHT / 2 };
  const center = zoom === 1 ? { x: WIDTH / 2, y: HEIGHT / 2 } : focus;
  const translateX = WIDTH / 2 - center.x * zoom;
  const translateY = HEIGHT / 2 - center.y * zoom;
  const sea = mode === "dark" ? "#163644" : "#d9ecf0";
  const groups = groupPoints(
    neighborhoods
      .map((area) => {
        const point = project(area);
        return {
          area,
          x: ((point.x * zoom + translateX) / WIDTH) * size.width,
          y: ((point.y * zoom + translateY) / HEIGHT) * size.height,
        };
      })
      .filter(
        (point) =>
          point.x >= 26 &&
          point.x <= size.width - 26 &&
          point.y >= 63 &&
          point.y <= size.height - 42,
      ),
  );
  const openAreas = neighborhoods.filter((area) => openIds.includes(area.id));

  return (
    <>
      <View
        style={[
          styles.frame,
          { height, backgroundColor: colors.soft, borderColor: colors.line },
        ]}
        onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          accessible={false}
        >
          <Rect width={WIDTH} height={HEIGHT} fill={colors.soft} />
          <G
            transform={`translate(${translateX} ${translateY}) scale(${zoom})`}
          >
            <Path
              d="M -30 310 C 89 330 98 280 178 299 S 258 324 333 312 S 445 319 580 275 L 590 480 L -30 480 Z"
              fill={sea}
            />
            <Path
              d="M 34 110 L 99 96 L 133 124 L 97 161 L 42 147 Z M 308 26 L 367 44 L 351 97 L 291 72 Z M 371 199 L 410 175 L 449 206 L 418 240 Z"
              fill={colors.green}
              opacity={0.08}
            />
            {roads.map((road) => (
              <Path
                key={road}
                d={road}
                fill="none"
                stroke={colors.line}
                strokeWidth={9}
                opacity={0.65}
              />
            ))}
            {roads.map((road) => (
              <Path
                key={`${road}-center`}
                d={road}
                fill="none"
                stroke={colors.surface}
                strokeWidth={3}
                opacity={0.65}
              />
            ))}
            <Path
              d="M 230 25 L 259 20 L 285 160 L 276 172 Z"
              fill={colors.line}
              opacity={0.6}
            />
            <Path
              d="M 244 28 L 275 158"
              stroke={colors.muted}
              strokeWidth={1.5}
              strokeDasharray="5 7"
              opacity={0.35}
            />
            <SvgText
              x={408}
              y={349}
              fill={colors.blue}
              fontSize={10}
              letterSpacing={3}
              textAnchor="middle"
              opacity={0.7}
            >
              GOLFE DE GUINÉE
            </SvgText>
            {neighborhoods.map((area) => {
              const point = project(area);
              const active = area.id === selectedId;
              return (
                <G key={area.id}>
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 25 : 17}
                    fill={colors[statusMeta[area.status].color]}
                    opacity={active ? 0.2 : 0.1}
                  />
                  {area.plannedUntil && (
                    // Task 67: ECG outage announced right now (dashed ring).
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 30 : 22}
                      fill="none"
                      stroke={PLANNED_COLOR}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  )}
                </G>
              );
            })}
          </G>
          {groups
            .filter((group) => group.points.length > 1)
            .map((group) => (
              <G key={group.points.map((p) => p.area.id).join("-")}>
                {group.points.map((point) => (
                  <G key={point.area.id}>
                    <Line
                      x1={(group.x / size.width) * WIDTH}
                      y1={(group.y / size.height) * HEIGHT}
                      x2={(point.x / size.width) * WIDTH}
                      y2={(point.y / size.height) * HEIGHT}
                      stroke={colors.muted}
                      strokeWidth={1}
                      opacity={0.55}
                    />
                    <Circle
                      cx={(point.x / size.width) * WIDTH}
                      cy={(point.y / size.height) * HEIGHT}
                      r={3}
                      fill={colors[statusMeta[point.area.status].color]}
                    />
                  </G>
                ))}
              </G>
            ))}
        </Svg>

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {groups.map((group) => {
            const ids = group.points.map((point) => point.area.id);
            const area =
              group.points.length === 1 ? group.points[0].area : undefined;
            const active = ids.includes(selectedId);
            const color = area
              ? colors[statusMeta[area.status].color]
              : colors.accent;
            return (
              <Pressable
                key={ids.join("-")}
                accessibilityRole="button"
                accessibilityLabel={
                  area
                    ? `${area.name}, ${statusMeta[area.status].label}`
                    : `${ids.length} quartiers proches : ${group.points.map((point) => point.area.name).join(", ")}`
                }
                accessibilityHint={
                  area
                    ? "Sélectionner ce quartier"
                    : "Ouvrir le choix des quartiers regroupés"
                }
                accessibilityState={{ selected: active }}
                onPress={() => (area ? onSelect(area.id) : setOpenIds(ids))}
                style={[
                  styles.marker,
                  {
                    left: group.x - 22,
                    top: group.y - 22,
                    zIndex: active ? 2 : 1,
                  },
                ]}
              >
                {active && selected && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.markerLabel,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.line,
                      },
                    ]}
                  >
                    <Txt size={10} weight="bold" numberOfLines={1}>
                      {selected.name}
                    </Txt>
                  </View>
                )}
                {area ? (
                  <View
                    style={{
                      width: active ? 23 : 17,
                      height: active ? 23 : 17,
                      borderRadius: 20,
                      backgroundColor: color,
                      borderWidth: 3,
                      borderColor: colors.surface,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: colors.surface,
                      borderWidth: 2,
                      borderColor: active ? colors.accent : colors.line,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Txt
                      size={14}
                      weight="extrabold"
                      style={{ color: active ? colors.accent : colors.ink }}
                    >
                      {ids.length}
                    </Txt>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

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
        <View pointerEvents="none" style={styles.compass}>
          <Compass size={20} color={colors.muted} />
        </View>
        <View
          style={[
            styles.controls,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          {[
            {
              icon: Plus,
              label: "Agrandir l’aperçu",
              onPress: () => setZoom((value) => Math.min(2.4, value + 0.35)),
            },
            {
              icon: Minus,
              label: "Réduire l’aperçu",
              onPress: () => setZoom((value) => Math.max(1, value - 0.35)),
            },
            {
              icon: Maximize2,
              label: "Afficher tous les quartiers",
              onPress: () => setZoom(1),
            },
          ].map(({ icon: Icon, label, onPress }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.control,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Icon size={18} color={colors.ink} />
            </Pressable>
          ))}
        </View>
        <View
          pointerEvents="none"
          style={[styles.caption, { backgroundColor: colors.surface }]}
        >
          <Txt size={10} tone="muted">
            Aperçu schématique · centres approximatifs
          </Txt>
        </View>
      </View>
      <Modal
        visible={openIds.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenIds([])}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000088",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer les quartiers regroupés"
            onPress={() => setOpenIds([])}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.canvas,
              padding: 20,
              paddingBottom: Math.max(20, insets.bottom),
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              maxHeight: "80%",
              gap: 14,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Txt
                accessibilityRole="header"
                size={20}
                weight="extrabold"
                style={{ flex: 1 }}
              >
                Quartiers à proximité
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setOpenIds([])}
                style={[
                  styles.control,
                  { backgroundColor: colors.soft, borderRadius: 12 },
                ]}
              >
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>
            <Txt size={12} tone="muted">
              Ces centres sont rapprochés dans l’aperçu. Choisissez votre
              quartier.
            </Txt>
            <ScrollView showsVerticalScrollIndicator={false}>
              {openAreas.map((area) => (
                <Pressable
                  key={area.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Choisir ${area.name}`}
                  accessibilityState={{ selected: area.id === selectedId }}
                  onPress={() => {
                    onSelect(area.id);
                    setOpenIds([]);
                  }}
                  style={{
                    minHeight: 62,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors[statusMeta[area.status].color],
                    }}
                  />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt weight="bold">{area.name}</Txt>
                    <Txt size={11} tone="muted">
                      {statusMeta[area.status].label}
                    </Txt>
                  </View>
                  {area.id === selectedId && (
                    <Check size={20} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default NeighborhoodMap;

const styles = StyleSheet.create({
  frame: { borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  marker: {
    position: "absolute",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  markerLabel: {
    position: "absolute",
    bottom: 42,
    minWidth: 45,
    maxWidth: 154,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
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
  compass: { position: "absolute", top: 24, right: 19 },
  controls: {
    position: "absolute",
    right: 12,
    bottom: 46,
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
  caption: {
    position: "absolute",
    bottom: 11,
    left: 11,
    right: 11,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
});
