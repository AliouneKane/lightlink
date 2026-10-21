import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { chartHours, type ZoneForecast } from "@/lib/forecast";
import { fonts } from "@/lib/theme";
import { useTheme } from "@/providers/theme-provider";
import { Txt, feedback } from "@/components/ui";

/** Twelve bars at the hours of chartHours (GMT), from the rules model of prediction/. */
export function ForecastChart({ forecast }: { forecast: ZoneForecast }) {
  const { riskValues, hourLabels, peakStartIndex, peakEndIndex, peakIndex } =
    forecast;
  const { colors } = useTheme();
  const [width, setWidth] = useState(300);
  const [selected, setSelected] = useState(peakIndex);
  const height = 218;
  const left = 35;
  const right = 5;
  const top = 23;
  const bottom = 31;
  const plotWidth = Math.max(120, width - left - right);
  const plotHeight = height - top - bottom;
  const step = plotWidth / riskValues.length;
  const barWidth = Math.max(5, step - 6);
  const y = (value: number) => top + plotHeight * (1 - value / 100);
  const x = (index: number) => left + step * index + step / 2;
  const selectedLabel =
    selected === peakIndex
      ? `Pic vers ${chartHours[peakIndex]} h`
      : `Vers ${chartHours[selected]} h`;
  const selectionDescription = `${selectedLabel}, risque de coupure ${riskValues[selected]} pour cent`;

  function select(index: number) {
    const next = Math.max(0, Math.min(riskValues.length - 1, index));
    if (next !== selected) {
      setSelected(next);
      feedback();
    }
  }

  const keyboardProps =
    Platform.OS === "web"
      ? {
          "aria-valuemin": 1,
          "aria-valuemax": riskValues.length,
          "aria-valuenow": selected + 1,
          "aria-valuetext": selectionDescription,
          onKeyDown: (event: { key: string; preventDefault: () => void }) => {
            if (
              [
                "ArrowRight",
                "ArrowUp",
                "ArrowLeft",
                "ArrowDown",
                "Home",
                "End",
              ].includes(event.key)
            ) {
              event.preventDefault();
              select(
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? riskValues.length - 1
                    : selected +
                      (event.key === "ArrowRight" || event.key === "ArrowUp"
                        ? 1
                        : -1),
              );
            }
          },
        }
      : {};

  return (
    <View
      style={styles.container}
      onLayout={(event) =>
        setWidth(Math.max(200, event.nativeEvent.layout.width))
      }
    >
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendMark,
              { backgroundColor: colors.green, opacity: 0.55 },
            ]}
          />
          <Txt size={11} tone="muted">
            Risque indicatif
          </Txt>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendMark, { backgroundColor: colors.yellow }]}
          />
          <Txt size={11} tone="muted">
            Heures sensibles
          </Txt>
        </View>
      </View>
      <Pressable
        {...keyboardProps}
        accessibilityRole="adjustable"
        accessibilityLabel={forecast.chartDescription}
        accessibilityHint="Balayez vers le haut ou le bas pour lire les différents repères. Les boutons précédent et suivant permettent aussi de les parcourir."
        accessibilityValue={{
          min: 1,
          max: riskValues.length,
          now: selected + 1,
          text: selectionDescription,
        }}
        accessibilityActions={[
          { name: "increment", label: "Repère suivant" },
          { name: "decrement", label: "Repère précédent" },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment")
            select(selected + 1);
          else if (event.nativeEvent.actionName === "decrement")
            select(selected - 1);
        }}
        onPress={(event) =>
          select(Math.floor((event.nativeEvent.locationX - left) / step))
        }
        style={{ height, width: "100%" }}
      >
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          accessible={false}
          pointerEvents="none"
        >
          <Rect
            x={left + step * peakStartIndex}
            y={top}
            width={step * (peakEndIndex - peakStartIndex + 1)}
            height={plotHeight}
            rx={9}
            fill={colors.yellow}
            fillOpacity={0.055}
          />
          {[100, 50, 0].map((value) => (
            <ViewlessGrid
              key={value}
              value={value}
              y={y(value)}
              left={left}
              width={width - right}
              lineColor={colors.line}
              textColor={colors.muted}
            />
          ))}
          {riskValues.map((value, index) => {
            const sensitive = index >= peakStartIndex && index <= peakEndIndex;
            return (
              <Rect
                key={index}
                x={x(index) - barWidth / 2}
                y={y(value)}
                width={barWidth}
                height={(plotHeight * value) / 100}
                rx={4}
                fill={sensitive ? colors.yellow : colors.green}
                fillOpacity={selected === index ? 1 : sensitive ? 0.78 : 0.35}
              />
            );
          })}
          <Line
            x1={x(selected)}
            x2={x(selected)}
            y1={top - 4}
            y2={height - bottom}
            stroke={colors.ink}
            strokeOpacity={0.45}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <Circle
            cx={x(selected)}
            cy={y(riskValues[selected])}
            r={4}
            fill={colors.surface}
            stroke={colors.ink}
            strokeWidth={2}
          />
          <SvgText
            x={Math.max(left + 18, Math.min(width - 20, x(selected)))}
            y={Math.max(13, y(riskValues[selected]) - 12)}
            fill={colors.ink}
            fontSize={11}
            fontFamily={fonts.bold}
            textAnchor="middle"
          >
            {riskValues[selected]} %
          </SvgText>
          {hourLabels.map((label, index) => (
            <SvgText
              key={label}
              x={left + (plotWidth * index) / (hourLabels.length - 1)}
              y={height - 8}
              fill={colors.muted}
              fontSize={11}
              fontFamily={fonts.medium}
              textAnchor={
                index === 0
                  ? "start"
                  : index === hourLabels.length - 1
                    ? "end"
                    : "middle"
              }
            >
              {label}
            </SvgText>
          ))}
        </Svg>
      </Pressable>
      <View
        style={[
          styles.selection,
          { backgroundColor: colors.soft, borderColor: colors.line },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Repère précédent"
          accessibilityState={{ disabled: selected === 0 }}
          disabled={selected === 0}
          onPress={() => select(selected - 1)}
          style={[styles.arrow, { opacity: selected === 0 ? 0.3 : 1 }]}
        >
          <ChevronLeft size={19} color={colors.ink} />
        </Pressable>
        <View style={styles.selectionCopy} accessibilityLiveRegion="polite">
          <Txt size={12} weight="bold">
            {selectedLabel}
          </Txt>
          <Txt size={11} tone="muted">
            {riskValues[selected]} % de risque de coupure
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Repère suivant"
          accessibilityState={{ disabled: selected === riskValues.length - 1 }}
          disabled={selected === riskValues.length - 1}
          onPress={() => select(selected + 1)}
          style={[
            styles.arrow,
            { opacity: selected === riskValues.length - 1 ? 0.3 : 1 },
          ]}
        >
          <ChevronRight size={19} color={colors.ink} />
        </Pressable>
      </View>
      <Txt size={10} tone="muted" style={styles.hint}>
        Touchez une barre pour voir le risque à chaque heure.
      </Txt>
    </View>
  );
}

function ViewlessGrid({
  value,
  y,
  left,
  width,
  lineColor,
  textColor,
}: {
  value: number;
  y: number;
  left: number;
  width: number;
  lineColor: string;
  textColor: string;
}) {
  return (
    <>
      <Line
        x1={left}
        x2={width}
        y1={y}
        y2={y}
        stroke={lineColor}
        strokeWidth={1}
        strokeDasharray={value === 0 ? undefined : "3 5"}
      />
      <SvgText
        x={0}
        y={y + 4}
        fill={textColor}
        fontSize={10}
        fontFamily={fonts.medium}
      >
        {value} %
      </SvgText>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 13, width: "100%" },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
  },
  legendItem: { flexDirection: "row", gap: 6, alignItems: "center" },
  legendMark: { width: 7, height: 7, borderRadius: 2 },
  selection: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 13,
    minHeight: 55,
  },
  arrow: {
    width: 44,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCopy: { flex: 1, alignItems: "center", gap: 1 },
  hint: { textAlign: "center", marginTop: -4 },
});
