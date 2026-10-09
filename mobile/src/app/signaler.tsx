import { useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  MapPin,
  MessageSquare,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Zap,
  ZapOff,
  type LucideIcon,
} from "lucide-react-native";
import {
  BackHeader,
  Button,
  Card,
  DemoNote,
  Field,
  Screen,
  SectionTitle,
  StatusPill,
  StorageNotice,
  Txt,
  ZonePicker,
  feedback,
} from "@/components/ui";
import {
  neighborhoods as pilotNeighborhoods,
  type EnergyStatus,
} from "@/lib/energy";
import { reportDraftKey, useFormDraft } from "@/lib/use-form-draft";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";

type ReportDraft = {
  zoneId: string;
  status: EnergyStatus | null;
  description: string;
};
function parseDraft(value: unknown): ReportDraft | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    !pilotNeighborhoods.some((zone) => zone.id === item.zoneId) ||
    ![null, "outage", "powered", "unstable"].includes(
      item.status as EnergyStatus | null,
    ) ||
    typeof item.description !== "string" ||
    item.description.length > 500
  )
    return null;
  return {
    zoneId: item.zoneId as string,
    status: item.status as EnergyStatus | null,
    description: item.description,
  };
}
const choices: {
  value: EnergyStatus;
  title: string;
  description: string;
  icon: LucideIcon;
  color: "green" | "red" | "amber";
}[] = [
  {
    value: "outage",
    title: "Le courant est coupé",
    description: "Aucune alimentation pour le moment.",
    icon: ZapOff,
    color: "red",
  },
  {
    value: "powered",
    title: "Le courant est disponible",
    description: "L’électricité fonctionne chez moi.",
    icon: Zap,
    color: "green",
  },
  {
    value: "unstable",
    title: "Le courant est instable",
    description: "Des interruptions ou des fluctuations.",
    icon: CircleHelp,
    color: "amber",
  },
];

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    zone?: string;
    neighborhoodId?: string;
    quartier?: string;
  }>();
  const { state, neighborhoods } = useDemo();
  const requestedZone = params.zone ?? params.neighborhoodId ?? params.quartier;
  const initialZone = neighborhoods.some((zone) => zone.id === requestedZone)
    ? requestedZone!
    : state.profile.neighborhoodId;
  return <ReportContent key={initialZone} initialZone={initialZone} />;
}

function ReportContent({ initialZone }: { initialZone: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, ready, neighborhoods, report } = useDemo();
  const reducedMotion = useReducedMotion();
  const draft = useFormDraft<ReportDraft>(
    reportDraftKey(initialZone),
    { zoneId: initialZone, status: null, description: "" },
    parseDraft,
  );
  const { zoneId, status, description } = draft.value;
  const [detailsExpanded, setDetailsExpanded] = useState<boolean | null>(null);
  const expanded = detailsExpanded ?? description.length > 0;
  const [discarding, setDiscarding] = useState(false);
  const [errors, setErrors] = useState<{
    status?: string;
    description?: string;
    general?: string;
  }>({});
  const [saved, setSaved] = useState<
    (ReportDraft & { status: EnergyStatus; author: string }) | null
  >(null);
  const scrollRef = useRef<ScrollView>(null);
  const descriptionRef = useRef<TextInput>(null);
  const statusY = useRef(0);
  const zone = neighborhoods.find(
    (item) => item.id === (saved?.zoneId ?? zoneId),
  );

  function submit() {
    Keyboard.dismiss();
    if (!status) {
      setErrors({ status: "Choisissez l’état du courant que vous observez." });
      scrollRef.current?.scrollTo({
        y: Math.max(0, statusY.current - 20),
        animated: !reducedMotion,
      });
      return;
    }
    const result = report({
      neighborhoodId: zoneId,
      status,
      description: description.trim(),
    });
    if (result) {
      if (result.includes("description")) {
        setErrors({ description: result });
        setDetailsExpanded(true);
        requestAnimationFrame(() => descriptionRef.current?.focus());
      } else setErrors({ general: result });
      return;
    }
    setSaved({
      ...draft.value,
      status,
      description: description.trim(),
      author: state.profile.name,
    });
    draft.clear();
    setErrors({});
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y: 0, animated: false }),
    );
  }

  function clearDraft() {
    Keyboard.dismiss();
    draft.clear();
    setErrors({});
    setDetailsExpanded(null);
    setDiscarding(false);
  }

  if (saved)
    return (
      <Screen scrollRef={scrollRef}>
        <BackHeader title="Votre signalement" />
        <StorageNotice />
        <View style={styles.successIntro} accessibilityLiveRegion="polite">
          <View style={[styles.successOuter, { backgroundColor: colors.soft }]}>
            <View
              style={[styles.successIcon, { backgroundColor: colors.yellow }]}
            >
              <Check size={40} color={colors.navy} strokeWidth={2} />
            </View>
          </View>
          <Txt
            size={29}
            weight="extrabold"
            accessibilityRole="header"
            style={styles.centerText}
          >
            Merci pour{"\n"}le coup de main.
          </Txt>
          <Txt size={14} tone="muted" style={styles.successDescription}>
            Votre signalement est enregistré sur cet appareil. L’état local du
            quartier a été mis à jour.
          </Txt>
        </View>
        <Card style={styles.successSummary}>
          <View style={styles.zoneSummary}>
            <MapPin size={19} color={colors.accent} />
            <Txt size={17} weight="bold" style={styles.flex}>
              {zone?.name}
            </Txt>
          </View>
          <StatusPill status={saved.status} />
          {saved.description !== "" && (
            <Txt size={14} tone="muted">
              {saved.description}
            </Txt>
          )}
          <View style={[styles.summaryFooter, { borderTopColor: colors.line }]}>
            <ShieldCheck size={15} color={colors.green} />
            <Txt size={12} tone="muted" style={styles.flex}>
              Contribution locale de {saved.author}
            </Txt>
          </View>
        </Card>
        <Button
          label="Voir la communauté"
          icon={ArrowRight}
          onPress={() => router.replace("/(tabs)/communaute")}
        />
        <Button
          label="Ajouter un autre signalement"
          variant="secondary"
          onPress={() => {
            setSaved(null);
            setDetailsExpanded(null);
            requestAnimationFrame(() =>
              scrollRef.current?.scrollTo({ y: 0, animated: false }),
            );
          }}
        />
        <DemoNote text="Il s’agit d’une simulation. Aucun signalement n’a été transmis à d’autres personnes ou au réseau électrique." />
      </Screen>
    );

  return (
    <Screen
      scrollRef={scrollRef}
      footer={
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.surface, borderTopColor: colors.line },
          ]}
        >
          {errors.general && (
            <Txt size={12} tone="danger" accessibilityRole="alert">
              {errors.general}
            </Txt>
          )}
          <Button
            label="Enregistrer mon signalement"
            icon={Send}
            onPress={submit}
            disabled={!ready || !draft.ready}
          />
          <Txt size={11} tone="muted" style={styles.footerHint}>
            Démonstration · enregistré uniquement sur cet appareil.
          </Txt>
        </View>
      }
    >
      <BackHeader title="Signaler le courant" />
      <StorageNotice />
      <View style={styles.intro}>
        <Txt
          size={25}
          weight="extrabold"
          accessibilityRole="header"
          style={styles.title}
        >
          Que se passe-t-il dans votre quartier ?
        </Txt>
        <Txt size={13} tone="muted">
          Choisissez ce que vous observez. Un détail reste facultatif.
        </Txt>
      </View>
      {!draft.ready && (
        <Txt size={12} tone="muted">
          Restauration du brouillon…
        </Txt>
      )}
      {draft.storageError && (
        <Txt size={12} tone="danger" accessibilityRole="alert">
          {draft.storageError}
        </Txt>
      )}
      {draft.hasDraft && (
        <View style={[styles.draftNotice, { backgroundColor: colors.soft }]}>
          <Save size={15} color={colors.muted} />
          <Txt size={12} tone="muted" style={styles.flex}>
            {draft.storageError
              ? "Brouillon de cette session"
              : "Brouillon conservé sur cet appareil"}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Effacer le brouillon"
            onPress={() => {
              Keyboard.dismiss();
              setDiscarding(true);
            }}
            style={styles.smallButton}
          >
            <Trash2 size={17} color={colors.muted} />
          </Pressable>
        </View>
      )}
      {discarding && (
        <Card>
          <Txt weight="bold">Effacer votre saisie ?</Txt>
          <Txt size={13} tone="muted">
            Le signalement n’a pas encore été enregistré.
          </Txt>
          <Button
            label="Effacer ce brouillon"
            variant="danger"
            onPress={clearDraft}
          />
          <Button
            label="Continuer la saisie"
            variant="secondary"
            onPress={() => setDiscarding(false)}
          />
        </Card>
      )}
      <View style={styles.fieldGroup}>
        <SectionTitle title="1. Votre quartier" />
        <ZonePicker
          value={zoneId}
          onChange={(value) => {
            draft.patch({ zoneId: value });
            setErrors({});
          }}
        />
      </View>
      <View
        style={styles.fieldGroup}
        onLayout={(event) => {
          statusY.current = event.nativeEvent.layout.y;
        }}
        accessibilityRole="radiogroup"
        accessibilityLabel="État du courant"
      >
        <SectionTitle title="2. L’état du courant" />
        {errors.status && (
          <Txt
            size={13}
            tone="danger"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errors.status}
          </Txt>
        )}
        {choices.map((choice) => {
          const selected = status === choice.value;
          const Icon = choice.icon;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.title}
              accessibilityState={{ checked: selected }}
              onPress={() => {
                draft.patch({ status: choice.value });
                setErrors({});
                feedback();
              }}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: selected ? colors.soft : colors.surface,
                  borderColor: selected ? colors.yellow : colors.line,
                  borderWidth: selected ? 2 : 1,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.choiceIcon,
                  { backgroundColor: colors[choice.color] + "16" },
                ]}
              >
                <Icon
                  size={23}
                  color={colors[choice.color]}
                  strokeWidth={1.8}
                />
              </View>
              <View style={styles.choiceCopy}>
                <Txt size={14} weight="bold">
                  {choice.title}
                </Txt>
                <Txt size={12} tone="muted">
                  {choice.description}
                </Txt>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? colors.yellow : colors.line,
                    backgroundColor: selected ? colors.yellow : "transparent",
                  },
                ]}
              >
                {selected && (
                  <Check size={12} color={colors.navy} strokeWidth={3} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Un détail à ajouter ?"
          accessibilityState={{ expanded }}
          onPress={() => {
            Keyboard.dismiss();
            setDetailsExpanded(!expanded);
          }}
          style={styles.noteHeading}
        >
          <MessageSquare size={18} color={colors.muted} />
          <View style={styles.flex}>
            <Txt size={14} weight="bold">
              Un détail à ajouter ?
            </Txt>
            <Txt size={11} tone="muted">
              Facultatif{description ? ` · ${description.length}/500` : ""}
            </Txt>
          </View>
          {expanded ? (
            <ChevronUp size={18} color={colors.muted} />
          ) : (
            <ChevronDown size={18} color={colors.muted} />
          )}
        </Pressable>
        {expanded && (
          <Field
            ref={descriptionRef}
            label="Votre observation"
            value={description}
            onChangeText={(value) => {
              draft.patch({ description: value });
              setErrors({});
            }}
            placeholder="Ex. Le courant vient de revenir dans ma rue…"
            multiline
            maxLength={500}
            error={errors.description}
            hint={`${description.length}/500 · Évitez les adresses exactes et les informations personnelles.`}
          />
        )}
      </Card>
      <DemoNote text="Le signalement reste sur cet appareil. Les horaires et prévisions du scénario ne sont pas recalculés." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { gap: 8 },
  title: { lineHeight: 34, letterSpacing: -0.6 },
  fieldGroup: { gap: 10 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 17,
    gap: 11,
    minHeight: 82,
  },
  choiceIcon: {
    width: 41,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  choiceCopy: { flex: 1, gap: 3 },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  noteHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 44,
  },
  draftNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 3,
    borderRadius: 13,
  },
  smallButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: 14, paddingHorizontal: 20, borderTopWidth: 1, gap: 8 },
  footerHint: { textAlign: "center" },
  successIntro: {
    alignItems: "center",
    gap: 21,
    paddingTop: 23,
    paddingBottom: 12,
  },
  successOuter: {
    width: 115,
    height: 115,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successIcon: {
    width: 82,
    height: 82,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: { textAlign: "center", lineHeight: 40, letterSpacing: -0.8 },
  successDescription: { textAlign: "center", lineHeight: 23, maxWidth: 310 },
  successSummary: { gap: 16 },
  zoneSummary: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
});
