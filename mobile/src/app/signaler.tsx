import { useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
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
    title: "The power is off",
    description: "No supply for now.",
    icon: ZapOff,
    color: "red",
  },
  {
    value: "powered",
    title: "The power is on",
    description: "Electricity works at my place.",
    icon: Zap,
    color: "green",
  },
  {
    value: "unstable",
    title: "The power is unstable",
    description: "Interruptions or fluctuations.",
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
  const scrollRef = useRef<ScrollViewInstance>(null);
  const descriptionRef = useRef<TextInputInstance>(null);
  const statusY = useRef(0);
  const zone = neighborhoods.find(
    (item) => item.id === (saved?.zoneId ?? zoneId),
  );

  function submit() {
    Keyboard.dismiss();
    if (!status) {
      setErrors({ status: "Choose the power status you observe." });
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
        <BackHeader title="Your report" />
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
            Thanks for{"\n"}lending a hand.
          </Txt>
          <Txt size={14} tone="muted" style={styles.successDescription}>
            Your report is saved on this device. The neighbourhood’s local
            status has been updated.
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
              Local contribution from {saved.author}
            </Txt>
          </View>
        </Card>
        <Button
          label="View the community"
          icon={ArrowRight}
          onPress={() => router.replace("/(tabs)/communaute")}
        />
        <Button
          label="Add another report"
          variant="secondary"
          onPress={() => {
            setSaved(null);
            setDetailsExpanded(null);
            requestAnimationFrame(() =>
              scrollRef.current?.scrollTo({ y: 0, animated: false }),
            );
          }}
        />
        <DemoNote text="This is a simulation. No report was sent to other people or to the power grid." />
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
            label="Save my report"
            icon={Send}
            onPress={submit}
            disabled={!ready || !draft.ready}
          />
          <Txt size={11} tone="muted" style={styles.footerHint}>
            Demo · saved only on this device.
          </Txt>
        </View>
      }
    >
      <BackHeader title="Report the power" />
      <StorageNotice />
      <View style={styles.intro}>
        <Txt
          size={25}
          weight="extrabold"
          accessibilityRole="header"
          style={styles.title}
        >
          What is happening in your neighbourhood?
        </Txt>
        <Txt size={13} tone="muted">
          Choose what you observe. A detail is optional.
        </Txt>
      </View>
      {!draft.ready && (
        <Txt size={12} tone="muted">
          Restoring the draft…
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
              ? "Draft for this session"
              : "Draft kept on this device"}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete the draft"
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
          <Txt weight="bold">Delete your input?</Txt>
          <Txt size={13} tone="muted">
            The report has not been saved yet.
          </Txt>
          <Button
            label="Delete this draft"
            variant="danger"
            onPress={clearDraft}
          />
          <Button
            label="Keep editing"
            variant="secondary"
            onPress={() => setDiscarding(false)}
          />
        </Card>
      )}
      <View style={styles.fieldGroup}>
        <SectionTitle title="1. Your neighbourhood" />
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
        accessibilityLabel="Power status"
      >
        <SectionTitle title="2. The power status" />
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
          accessibilityLabel="Anything to add?"
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
              Anything to add?
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
            label="Your observation"
            value={description}
            onChangeText={(value) => {
              draft.patch({ description: value });
              setErrors({});
            }}
            placeholder="E.g. The power just came back on my street…"
            multiline
            maxLength={500}
            error={errors.description}
            hint={`${description.length}/500 · Avoid exact addresses and personal information.`}
          />
        )}
      </Card>
      <DemoNote text="The report stays on this device. The scenario’s schedules and forecasts are not recalculated." />
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
