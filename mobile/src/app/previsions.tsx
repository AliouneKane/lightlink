import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  ShieldCheck,
  Sparkles,
  ZapOff,
} from "lucide-react-native";
import {
  BackHeader,
  Button,
  Card,
  DemoNote,
  Screen,
  SectionTitle,
  Txt,
  ZonePicker,
} from "@/components/ui";
import { ForecastChart } from "@/components/forecast-chart";
import {
  answerReport,
  findAnswer,
  formatDay,
  formatTime,
  getZoneAnnouncements,
  isActive,
  scheduleRowsToAnnouncements,
} from "@/lib/energy";
import { forecastSourceLabel, getForecast } from "@/lib/forecast";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";

const methodSources = [
  {
    number: "01",
    title: "ECG schedules",
    description: "Outages announced by the ECG for your neighbourhood.",
  },
  {
    number: "02",
    title: "Neighbourhood history",
    description: "Frequency and median duration of outages.",
  },
  {
    number: "03",
    title: "Community reports",
    description: "Recent contributions to refine the estimate.",
  },
];

export default function ForecastScreen() {
  const params = useLocalSearchParams<{ zone?: string }>();
  const { state, neighborhoods } = useDemo();
  const requested = neighborhoods.find((zone) => zone.id === params.zone)?.id;
  const initialZone = requested ?? state.profile.neighborhoodId;
  return <ForecastContent key={initialZone} initialZone={initialZone} />;
}

function ForecastContent({ initialZone }: { initialZone: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    neighborhoods,
    state,
    report,
    liveEnabled,
    liveSchedules,
    livePredictions,
  } = useDemo();
  const [zoneId, setZoneId] = useState(initialZone);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const homeZone =
    neighborhoods.find((item) => item.id === state.profile.neighborhoodId) ??
    neighborhoods[0];
  const announcementTime = new Date();
  // Live mode reads the ECG schedules of the database and never adds a demo announcement.
  const announcements = liveEnabled
    ? getZoneAnnouncements(
        homeZone.id,
        announcementTime,
        scheduleRowsToAnnouncements(liveSchedules),
        false,
      )
    : getZoneAnnouncements(homeZone.id, announcementTime);
  const currentAnnouncement = announcements.find((item) =>
    isActive(item, announcementTime),
  );
  const currentAnswer = currentAnnouncement
    ? findAnswer(state.reports, currentAnnouncement, state.profile.name)
    : undefined;
  const pastAnnouncements = announcements.filter((item) => !item.demo);

  function answerAnnouncement(hasPower: boolean) {
    if (!currentAnnouncement) return;
    setAnswerError(report(answerReport(currentAnnouncement, hasPower)));
  }
  const [showMethod, setShowMethod] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const zone =
    neighborhoods.find((item) => item.id === zoneId) ?? neighborhoods[0];
  const forecast = getForecast(zone.id, livePredictions);
  // Task 105: the colour follows the confidence level, never green when it is low.
  const confidenceColor =
    forecast.confidenceLevel === "high"
      ? colors.green
      : forecast.confidenceLevel === "medium"
        ? colors.amber
        : colors.muted;

  function openEcg() {
    setLinkError(null);
    void Linking.openURL("https://www.ecg.com.gh/").catch(() =>
      setLinkError(
        "The ECG website could not open. Try again when your connection is available.",
      ),
    );
  }

  return (
    <Screen>
      <BackHeader title="Forecast" />
      <View style={styles.intro}>
        <View
          style={styles.scenarioLine}
          accessible
          accessibilityLabel={forecastSourceLabel(forecast)}
        >
          <View style={[styles.demoDot, { backgroundColor: colors.accent }]} />
          <Txt size={10} weight="bold" tone="muted" style={styles.eyebrow}>
            {forecastSourceLabel(forecast).toUpperCase()}
          </Txt>
        </View>
        <Txt
          size={30}
          weight="extrabold"
          accessibilityRole="header"
          style={styles.headline}
        >
          The rhythm of{"\n"}
          <Txt
            size={30}
            weight="extrabold"
            tone="accent"
            style={styles.headline}
          >
            your power.
          </Txt>
        </Txt>
        <Txt size={13} tone="muted">
          Transparent estimates to plan your day.
        </Txt>
      </View>
      <ZonePicker
        label="Forecast neighbourhood"
        value={zoneId}
        onChange={setZoneId}
      />

      <Card style={styles.forecastCard}>
        <View style={[styles.window, { backgroundColor: colors.yellow }]}>
          <View style={styles.between}>
            <Txt size={11} weight="extrabold" style={styles.windowEyebrow}>
              LIKELY WINDOW
            </Txt>
            <ZapOff size={18} color={colors.navy} />
          </View>
          <Txt size={29} weight="extrabold" style={styles.windowTime}>
            {forecast.windowStart}
            <Txt size={24} weight="medium" style={{ color: "#58604a" }}>
              {" "}
              –{" "}
            </Txt>
            {forecast.windowEnd}
          </Txt>
          <Txt size={12} weight="medium" style={{ color: "#34442d" }}>
            {forecast.summary}
          </Txt>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <View style={styles.row}>
              <Clock3 size={14} color={colors.muted} />
              <Txt size={11} tone="muted">
                Peak risk
              </Txt>
            </View>
            <Txt size={24} weight="extrabold" style={styles.metricValue}>
              {forecast.probability}%
            </Txt>
          </View>
          <View
            style={[styles.metricDivider, { backgroundColor: colors.line }]}
          />
          <View style={styles.metric}>
            <View style={styles.row}>
              <ShieldCheck size={14} color={colors.muted} />
              <Txt size={11} tone="muted">
                {forecast.confidenceLevel[0].toUpperCase() +
                  forecast.confidenceLevel.slice(1)}{" "}
                confidence
              </Txt>
            </View>
            <Txt
              size={24}
              weight="extrabold"
              style={[styles.metricValue, { color: confidenceColor }]}
            >
              {forecast.confidence}
              <Txt size={16} weight="bold" style={{ color: confidenceColor }}>
                %
              </Txt>
            </Txt>
          </View>
        </View>
        <View style={[styles.chartSection, { borderTopColor: colors.line }]}>
          <View style={styles.between}>
            <Txt size={15} weight="bold">
              Outage risk
            </Txt>
            <Txt size={10} weight="bold" tone="muted">
              {forecast.hourLabels[0]} –{" "}
              {forecast.hourLabels[forecast.hourLabels.length - 1]}
            </Txt>
          </View>
          <ForecastChart key={zone.id} forecast={forecast} />
        </View>
      </Card>

      <Card style={[styles.preparation, { backgroundColor: colors.soft }]}>
        <View style={styles.preparationHeading}>
          <View
            style={[
              styles.preparationIcon,
              { backgroundColor: colors.yellow + "20" },
            ]}
          >
            <Sparkles size={21} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Txt size={17} weight="extrabold">
              {forecast.summary}.
            </Txt>
            <Txt size={11} tone="muted">
              Your neighbourhood · {zone.name}
            </Txt>
          </View>
        </View>
        <Txt size={13} tone="muted" style={styles.paragraph}>
          {forecast.insight}
        </Txt>
        <Button
          label="Find a solution"
          icon={ArrowRight}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/partage",
              params: { zone: zoneId },
            })
          }
        />
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="An estimate, in full transparency"
          accessibilityState={{ expanded: showMethod }}
          onPress={() => setShowMethod(!showMethod)}
          style={styles.methodHeading}
        >
          <ShieldCheck size={23} color={colors.accent} />
          <Txt size={16} weight="bold" style={styles.flex}>
            An estimate,{"\n"}in full transparency.
          </Txt>
          {showMethod ? (
            <ChevronUp size={19} color={colors.muted} />
          ) : (
            <ChevronDown size={19} color={colors.muted} />
          )}
        </Pressable>
        <Txt size={13} tone="muted" style={styles.paragraph}>
          These figures come from official ECG announcements and the
          neighbourhood’s past outages. Every parameter is sourced or
          recalibrated with residents’ answers.
        </Txt>
        {showMethod && (
          <View style={styles.methodList}>
            {methodSources.map((source) => (
              <View
                key={source.number}
                style={[styles.methodItem, { borderTopColor: colors.line }]}
              >
                <View
                  style={[
                    styles.methodNumber,
                    { backgroundColor: colors.soft },
                  ]}
                >
                  <Txt size={11} weight="extrabold" tone="accent">
                    {source.number}
                  </Txt>
                </View>
                <View style={styles.flex}>
                  <Txt size={13} weight="bold">
                    {source.title}
                  </Txt>
                  <Txt size={12} tone="muted" style={styles.methodDescription}>
                    {source.description}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        )}
        <Txt size={11} tone="muted" style={styles.certainty}>
          A forecast shows a possibility, never a certainty.
        </Txt>
      </Card>

      <SectionTitle title="The data behind the estimate" />
      <Card style={styles.dataCard}>
        <View style={styles.between}>
          <View style={styles.row}>
            <CalendarDays size={18} color={colors.accent} />
            <Txt size={15} weight="bold">
              ECG schedule
            </Txt>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.soft }]}>
            <Txt size={9} weight="extrabold" tone="muted">
              {homeZone.name.toUpperCase()}
            </Txt>
          </View>
        </View>
        {currentAnnouncement && (
          <View
            style={[styles.question, { borderColor: colors.accent }]}
            accessibilityRole="summary"
          >
            <Txt size={12} tone="muted">
              {currentAnnouncement.demo
                ? "DEMO · Today · demo scenario"
                : `${formatDay(currentAnnouncement.startsAt)} · ${formatTime(currentAnnouncement.startsAt)}–${formatTime(currentAnnouncement.endsAt)} GMT`}
            </Txt>
            <Txt size={15} weight="bold" accessibilityRole="header">
              Do you have power?
            </Txt>
            <Txt size={12} tone="muted" style={styles.paragraph}>
              {currentAnnouncement.demo
                ? "Demo announcement: the ECG published nothing for your neighbourhood today."
                : `Outage announced by the ECG: ${currentAnnouncement.localities}.`}
            </Txt>
            <Button
              label="Yes, I have power"
              variant={
                currentAnswer?.status === "powered" ? "primary" : "secondary"
              }
              onPress={() => answerAnnouncement(true)}
            />
            <Button
              label="No, it’s off"
              variant={
                currentAnswer?.status === "outage" ? "primary" : "secondary"
              }
              onPress={() => answerAnnouncement(false)}
            />
            {currentAnswer && (
              <Txt size={12} accessibilityLiveRegion="polite">
                Answer saved:{" "}
                {currentAnswer.status === "powered"
                  ? "power available"
                  : "outage"}
                . You can change it.
              </Txt>
            )}
            {answerError && (
              <Txt size={12} tone="danger" accessibilityRole="alert">
                {answerError}
              </Txt>
            )}
            <Txt size={11} tone="muted">
              Your answers check whether announcements are kept. Only the number
              of answers is used in the calculation.
            </Txt>
          </View>
        )}
        {pastAnnouncements.length > 0 ? (
          pastAnnouncements.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="link"
              accessibilityLabel={`ECG announcement of ${formatDay(item.startsAt)}, source`}
              onPress={() =>
                void Linking.openURL(item.sourceUrl).catch(() => {})
              }
              style={[styles.announcement, { borderColor: colors.line }]}
            >
              <Txt size={12} weight="bold">
                {formatDay(item.startsAt)} · {formatTime(item.startsAt)}–
                {formatTime(item.endsAt)}
              </Txt>
              <Txt size={12} tone="muted">
                {item.localities}
                {item.partial ? " (partial)" : ""} · ECG source
              </Txt>
            </Pressable>
          ))
        ) : (
          <Txt size={12} tone="muted" style={styles.paragraph}>
            No recent ECG announcement for {homeZone.name}.
          </Txt>
        )}
        {linkError && (
          <Txt size={12} tone="danger" accessibilityRole="alert">
            {linkError}
          </Txt>
        )}
        <Button
          label="Visit ECG"
          icon={ArrowUpRight}
          variant="secondary"
          onPress={openEcg}
        />
      </Card>
      <Card style={styles.dataCard}>
        <View style={styles.between}>
          <View style={styles.row}>
            <Activity size={18} color={colors.accent} />
            <Txt size={15} weight="bold">
              Data quality
            </Txt>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.soft }]}>
            <Txt size={9} weight="extrabold" tone="muted">
              ESTIMATE
            </Txt>
          </View>
        </View>
        <Txt size={15} weight="bold">
          {forecast.announced
            ? "Outage announced by the ECG"
            : "Few days observed"}
        </Txt>
        <Txt size={12} tone="muted" style={styles.paragraph}>
          {forecast.announced
            ? "Confidence measures the share of ECG announcements actually kept; your answers to “Do you have power?” adjust it."
            : "Without an announcement, confidence reflects the number of outage days observed in the neighbourhood. It grows with your reports."}
        </Txt>
      </Card>
      <Button
        label="Report in this neighbourhood"
        icon={ZapOff}
        variant="ghost"
        onPress={() =>
          router.push({ pathname: "/signaler", params: { zone: zoneId } })
        }
      />
      <DemoNote text="Scenario of 4 October 2026 · reports change the local status without recalculating this chart or its confidence." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { gap: 9 },
  scenarioLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  demoDot: { width: 5, height: 5, borderRadius: 3 },
  eyebrow: { letterSpacing: 0.65, flex: 1 },
  headline: { lineHeight: 38, letterSpacing: -1 },
  forecastCard: { padding: 18, gap: 19 },
  window: { padding: 17, borderRadius: 16, gap: 8 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  windowEyebrow: { color: "#132d39", letterSpacing: 1 },
  windowTime: { color: "#132d39", lineHeight: 38, letterSpacing: -0.9 },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 19,
    paddingHorizontal: 4,
  },
  metric: { flex: 1, gap: 5 },
  metricDivider: { width: 1, height: 37 },
  metricValue: { lineHeight: 32, letterSpacing: -0.6 },
  chartSection: { borderTopWidth: 1, paddingTop: 17, gap: 17 },
  preparation: { gap: 15, padding: 20 },
  preparationHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  preparationIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  paragraph: { lineHeight: 21 },
  methodHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  methodList: { gap: 14 },
  methodItem: {
    flexDirection: "row",
    gap: 11,
    alignItems: "flex-start",
    borderTopWidth: 1,
    paddingTop: 15,
  },
  methodNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  methodDescription: { lineHeight: 19, marginTop: 4 },
  certainty: { fontStyle: "italic", lineHeight: 18 },
  dataCard: { gap: 12 },
  tag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  question: { gap: 10, padding: 12, borderWidth: 1, borderRadius: 12 },
  announcement: { gap: 2, paddingVertical: 8, borderBottomWidth: 1 },
});
