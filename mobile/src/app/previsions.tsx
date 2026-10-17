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
  DEMO_LABEL,
  DEMO_TIMESTAMP,
  answerReport,
  findAnswer,
  formatDay,
  formatTime,
  getZoneAnnouncements,
  isActive,
  scheduleRowsToAnnouncements,
} from "@/lib/energy";
import { forecastScenario } from "@/lib/forecast";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";

const scenarioDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
}).format(new Date(DEMO_TIMESTAMP));
const methodSources = [
  {
    number: "01",
    title: "Horaires ECG",
    description: "Calendriers officiels à intégrer par le backend.",
  },
  {
    number: "02",
    title: "Historique du quartier",
    description: "Fréquence et durée médiane des coupures.",
  },
  {
    number: "03",
    title: "Signalements communautaires",
    description: "Des contributions récentes pour affiner l’estimation.",
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
  const { neighborhoods, state, report, liveEnabled, liveSchedules } =
    useDemo();
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

  function openEcg() {
    setLinkError(null);
    void Linking.openURL("https://www.ecg.com.gh/").catch(() =>
      setLinkError(
        "Le site ECG n’a pas pu s’ouvrir. Réessayez lorsque votre connexion est disponible.",
      ),
    );
  }

  return (
    <Screen>
      <BackHeader title="Prévisions" />
      <View style={styles.intro}>
        <View
          style={styles.scenarioLine}
          accessible
          accessibilityLabel={DEMO_LABEL}
        >
          <View style={[styles.demoDot, { backgroundColor: colors.accent }]} />
          <Txt size={10} weight="bold" tone="muted" style={styles.eyebrow}>
            {scenarioDate.toUpperCase()} · SCÉNARIO SIMULÉ
          </Txt>
        </View>
        <Txt
          size={30}
          weight="extrabold"
          accessibilityRole="header"
          style={styles.headline}
        >
          Le rythme de{"\n"}
          <Txt
            size={30}
            weight="extrabold"
            tone="accent"
            style={styles.headline}
          >
            votre énergie.
          </Txt>
        </Txt>
        <Txt size={13} tone="muted">
          Des estimations transparentes pour anticiper votre journée.
        </Txt>
      </View>
      <ZonePicker
        label="Quartier des prévisions"
        value={zoneId}
        onChange={setZoneId}
      />

      <Card style={styles.forecastCard}>
        <View style={[styles.window, { backgroundColor: colors.yellow }]}>
          <View style={styles.between}>
            <Txt size={11} weight="extrabold" style={styles.windowEyebrow}>
              CRÉNEAU PROBABLE
            </Txt>
            <ZapOff size={18} color={colors.navy} />
          </View>
          <Txt size={29} weight="extrabold" style={styles.windowTime}>
            {forecastScenario.windowStart}
            <Txt size={24} weight="medium" style={{ color: "#58604a" }}>
              {" "}
              –{" "}
            </Txt>
            {forecastScenario.windowEnd}
          </Txt>
          <Txt size={12} weight="medium" style={{ color: "#34442d" }}>
            Coupure possible ce soir · exemple simulé
          </Txt>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <View style={styles.row}>
              <Clock3 size={14} color={colors.muted} />
              <Txt size={11} tone="muted">
                Durée estimée
              </Txt>
            </View>
            <Txt size={24} weight="extrabold" style={styles.metricValue}>
              {forecastScenario.durationLabel}
            </Txt>
          </View>
          <View
            style={[styles.metricDivider, { backgroundColor: colors.line }]}
          />
          <View style={styles.metric}>
            <View style={styles.row}>
              <ShieldCheck size={14} color={colors.muted} />
              <Txt size={11} tone="muted">
                Confiance
              </Txt>
            </View>
            <Txt
              size={24}
              weight="extrabold"
              style={[styles.metricValue, { color: colors.green }]}
            >
              {zone.confidence}
              <Txt size={16} weight="bold" style={{ color: colors.green }}>
                {" "}
                %
              </Txt>
            </Txt>
          </View>
        </View>
        <View style={[styles.chartSection, { borderTopColor: colors.line }]}>
          <View style={styles.between}>
            <Txt size={15} weight="bold">
              Risque de coupure
            </Txt>
            <Txt size={10} weight="bold" tone="muted">
              {forecastScenario.hourLabels[0]} –{" "}
              {
                forecastScenario.hourLabels[
                  forecastScenario.hourLabels.length - 1
                ]
              }
            </Txt>
          </View>
          <ForecastChart />
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
              Anticipez votre soirée.
            </Txt>
            <Txt size={11} tone="muted">
              Votre quartier · {zone.name}
            </Txt>
          </View>
        </View>
        <Txt size={13} tone="muted" style={styles.paragraph}>
          Dans cet exemple, le risque augmente après 16 h. Rechargez vos
          appareils ou explorez les offres de votre quartier.
        </Txt>
        <Button
          label="Trouver une solution"
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
          accessibilityLabel="Une estimation, en toute transparence"
          accessibilityState={{ expanded: showMethod }}
          onPress={() => setShowMethod(!showMethod)}
          style={styles.methodHeading}
        >
          <ShieldCheck size={23} color={colors.accent} />
          <Txt size={16} weight="bold" style={styles.flex}>
            Une estimation,{"\n"}en toute transparence.
          </Txt>
          {showMethod ? (
            <ChevronUp size={19} color={colors.muted} />
          ) : (
            <ChevronDown size={19} color={colors.muted} />
          )}
        </Pressable>
        <Txt size={13} tone="muted" style={styles.paragraph}>
          Ces chiffres illustrent le futur moteur de prévision. Ils ne sont pas
          calculés à partir de données réelles.
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
          Une prévision indique une possibilité, jamais une certitude.
        </Txt>
      </Card>

      <SectionTitle title="Les données derrière l’estimation" />
      <Card style={styles.dataCard}>
        <View style={styles.between}>
          <View style={styles.row}>
            <CalendarDays size={18} color={colors.accent} />
            <Txt size={15} weight="bold">
              Calendrier ECG
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
                ? "DÉMO · Aujourd’hui · scénario de démonstration"
                : `${formatDay(currentAnnouncement.startsAt)} · ${formatTime(currentAnnouncement.startsAt)}–${formatTime(currentAnnouncement.endsAt)} GMT`}
            </Txt>
            <Txt size={15} weight="bold" accessibilityRole="header">
              Avez-vous du courant ?
            </Txt>
            <Txt size={12} tone="muted" style={styles.paragraph}>
              {currentAnnouncement.demo
                ? "Annonce de démonstration : l’ECG n’a rien publié pour votre quartier aujourd’hui."
                : `Coupure annoncée par l’ECG : ${currentAnnouncement.localities}.`}
            </Txt>
            <Button
              label="Oui, j’ai du courant"
              variant={
                currentAnswer?.status === "powered" ? "primary" : "secondary"
              }
              onPress={() => answerAnnouncement(true)}
            />
            <Button
              label="Non, c’est coupé"
              variant={
                currentAnswer?.status === "outage" ? "primary" : "secondary"
              }
              onPress={() => answerAnnouncement(false)}
            />
            {currentAnswer && (
              <Txt size={12} accessibilityLiveRegion="polite">
                Réponse enregistrée :{" "}
                {currentAnswer.status === "powered"
                  ? "courant disponible"
                  : "coupure"}
                . Vous pouvez la modifier.
              </Txt>
            )}
            {answerError && (
              <Txt size={12} tone="danger" accessibilityRole="alert">
                {answerError}
              </Txt>
            )}
            <Txt size={11} tone="muted">
              Vos réponses vérifient si les annonces sont tenues. Seul le nombre
              de réponses sert au calcul.
            </Txt>
          </View>
        )}
        {pastAnnouncements.length > 0 ? (
          pastAnnouncements.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="link"
              accessibilityLabel={`Annonce ECG du ${formatDay(item.startsAt)}, source`}
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
                {item.partial ? " (partiel)" : ""} · Source ECG
              </Txt>
            </Pressable>
          ))
        ) : (
          <Txt size={12} tone="muted" style={styles.paragraph}>
            Aucune annonce ECG récente pour {homeZone.name}.
          </Txt>
        )}
        {linkError && (
          <Txt size={12} tone="danger" accessibilityRole="alert">
            {linkError}
          </Txt>
        )}
        <Button
          label="Consulter ECG"
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
              Qualité des données
            </Txt>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.soft }]}>
            <Txt size={9} weight="extrabold" tone="muted">
              ESTIMATION
            </Txt>
          </View>
        </View>
        <Txt size={15} weight="bold">
          Pas encore assez de données réelles
        </Txt>
        <Txt size={12} tone="muted" style={styles.paragraph}>
          La confiance réelle sera calculée après intégration des calendriers et
          des signalements vérifiés. Le graphique ci-dessus est un exemple.
        </Txt>
      </Card>
      <Button
        label="Signaler dans ce quartier"
        icon={ZapOff}
        variant="ghost"
        onPress={() =>
          router.push({ pathname: "/signaler", params: { zone: zoneId } })
        }
      />
      <DemoNote text="Scénario du 4 octobre 2026 · les signalements modifient l’état local, sans recalculer ce graphique ni sa confiance." />
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
