import { useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  MessageSquare,
  PlugZap,
  Plus,
  Save,
  Sun,
  Trash2,
  Users,
} from "lucide-react-native";
import {
  BackHeader,
  Button,
  Card,
  Chips,
  DemoNote,
  Field,
  Screen,
  SectionTitle,
  StorageNotice,
  Txt,
  ZonePicker,
} from "@/components/ui";
import { neighborhoods, type EnergySource } from "@/lib/energy";
import { sourceMeta } from "@/lib/theme";
import { formDraftKeys, useFormDraft } from "@/lib/use-form-draft";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";

type OfferDraft = {
  title: string;
  zone: string;
  source: EnergySource;
  capacity: string;
  price: string;
  slots: string;
  until: string;
  description: string;
};
type InputKey =
  "title" | "capacity" | "slots" | "until" | "price" | "description";
type Errors = Partial<Record<InputKey | "general", string>>;
function parseDraft(value: unknown): OfferDraft | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const limits = {
    title: 100,
    capacity: 100,
    price: 7,
    slots: 2,
    until: 5,
    description: 600,
  };
  if (
    Object.entries(limits).some(
      ([key, limit]) =>
        typeof item[key] !== "string" || (item[key] as string).length > limit,
    ) ||
    !neighborhoods.some((zone) => zone.id === item.zone) ||
    !["solar", "generator", "battery"].includes(String(item.source))
  )
    return null;
  return {
    title: item.title as string,
    zone: item.zone as string,
    source: item.source as EnergySource,
    capacity: item.capacity as string,
    price: item.price as string,
    slots: item.slots as string,
    until: item.until as string,
    description: item.description as string,
  };
}

export default function Publish() {
  const { state, ready, createOffer, liveEnabled } = useDemo();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const draft = useFormDraft<OfferDraft>(
    formDraftKeys.offer,
    {
      title: "",
      zone: state.profile.neighborhoodId,
      source: "solar",
      capacity: "",
      price: "0",
      slots: "2",
      until: "19:00",
      description: "",
    },
    parseDraft,
  );
  const value = draft.value;
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState<boolean | null>(null);
  const expanded = detailsExpanded ?? value.description.length > 0;
  const [published, setPublished] = useState<{
    value: OfferDraft;
    previousIds: string[];
  } | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const titleRef = useRef<TextInputInstance>(null);
  const capacityRef = useRef<TextInputInstance>(null);
  const slotsRef = useRef<TextInputInstance>(null);
  const untilRef = useRef<TextInputInstance>(null);
  const priceRef = useRef<TextInputInstance>(null);
  const descriptionRef = useRef<TextInputInstance>(null);
  const sectionY = useRef({ source: 0, welcome: 0, description: 0 });
  const fieldY = useRef<Partial<Record<InputKey, number>>>({});

  function change<K extends keyof OfferDraft>(key: K, next: OfferDraft[K]) {
    draft.patch({ [key]: next } as Partial<OfferDraft>);
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      general: undefined,
    }));
  }

  function focusError(key: InputKey) {
    const section =
      key === "title" || key === "capacity"
        ? "source"
        : key === "description"
          ? "description"
          : "welcome";
    if (key === "description") setDetailsExpanded(true);
    scrollRef.current?.scrollTo({
      y: Math.max(
        0,
        sectionY.current[section] + (fieldY.current[key] ?? 0) - 10,
      ),
      animated: !reducedMotion,
    });
    const refs = {
      title: titleRef,
      capacity: capacityRef,
      slots: slotsRef,
      until: untilRef,
      price: priceRef,
      description: descriptionRef,
    };
    requestAnimationFrame(() => refs[key].current?.focus());
  }

  async function submit() {
    if (submitting) return;
    const nextErrors: Errors = {};
    if (value.title.trim().length < 3)
      nextErrors.title = "Give a title of at least 3 characters.";
    if (!value.capacity.trim())
      nextErrors.capacity = "Give the capacity and the devices accepted.";
    if (
      !/^\d+$/.test(value.slots) ||
      Number(value.slots) < 1 ||
      Number(value.slots) > 50
    )
      nextErrors.slots = "Enter between 1 and 50 places.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.until))
      nextErrors.until = "Use the HH:mm format, for example 19:00.";
    const price = Number(value.price.replace(",", "."));
    if (
      !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.price.trim()) ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1000
    )
      nextErrors.price = "Enter an amount from 0 to 1,000 GHS.";
    setErrors(nextErrors);
    const first = (
      ["title", "capacity", "slots", "until", "price"] as InputKey[]
    ).find((key) => nextErrors[key]);
    if (first) {
      focusError(first);
      return;
    }
    Keyboard.dismiss();
    // The confirmation and the cleared draft wait for the database (PAN's review of #9).
    setSubmitting(true);
    const result = await createOffer({
      title: value.title,
      neighborhoodId: value.zone,
      source: value.source,
      capacity: value.capacity,
      price,
      slots: Number(value.slots),
      until: value.until,
      description: value.description,
    });
    setSubmitting(false);
    if (result) {
      setErrors({ general: result });
      return;
    }
    setPublished({
      value: { ...value, title: value.title.trim() },
      previousIds: state.offers.map((offer) => offer.id),
    });
    draft.clear();
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y: 0, animated: false }),
    );
  }

  function clearDraft() {
    Keyboard.dismiss();
    draft.clear();
    setErrors({});
    setDiscarding(false);
    setDetailsExpanded(null);
  }

  if (published) {
    const publishedValue = published.value;
    const offer = state.offers.find(
      (item) =>
        item.id.startsWith("mobile-offer-") &&
        !published.previousIds.includes(item.id) &&
        item.title === publishedValue.title &&
        item.neighborhoodId === publishedValue.zone,
    );
    const meta = sourceMeta[publishedValue.source];
    return (
      <Screen scrollRef={scrollRef}>
        <BackHeader title="Your offer is ready" />
        <StorageNotice />
        <View style={styles.successIntro} accessibilityLiveRegion="polite">
          <View style={[styles.successIcon, { backgroundColor: colors.soft }]}>
            <CheckCircle2 size={42} color={colors.green} />
          </View>
          <Txt size={28} weight="extrabold" accessibilityRole="header">
            One more light.
          </Txt>
          <Txt size={14} tone="muted" style={styles.centerText}>
            Your offer is published on this device. You can find it and manage
            its availability from your space.
          </Txt>
        </View>
        <Card>
          <View style={styles.row}>
            <meta.icon size={19} color={colors[meta.color]} />
            <Txt size={12} weight="bold" style={{ color: colors[meta.color] }}>
              {meta.label}
            </Txt>
          </View>
          <Txt size={20} weight="extrabold">
            {publishedValue.title}
          </Txt>
          <View style={styles.row}>
            <MapPin size={16} color={colors.muted} />
            <Txt size={13} tone="muted">
              {
                neighborhoods.find((zone) => zone.id === publishedValue.zone)
                  ?.name
              }
            </Txt>
          </View>
          <Txt size={13} tone="muted">
            {publishedValue.capacity}
          </Txt>
          <View style={[styles.summaryRow, { borderTopColor: colors.line }]}>
            <View style={styles.row}>
              <Users size={15} color={colors.muted} />
              <Txt size={12}>{publishedValue.slots} places</Txt>
            </View>
            <View style={styles.row}>
              <Clock3 size={15} color={colors.muted} />
              <Txt size={12}>{publishedValue.until}</Txt>
            </View>
            <Txt size={12} weight="bold">
              {publishedValue.price} GHS
            </Txt>
          </View>
        </Card>
        <Button
          label="View my offer"
          icon={ArrowRight}
          onPress={() =>
            offer
              ? router.replace({
                  pathname: "/offre/[id]",
                  params: { id: offer.id, zone: publishedValue.zone },
                })
              : router.replace({
                  pathname: "/partage",
                  params: { zone: publishedValue.zone },
                })
          }
        />
        <Button
          label="Share another source"
          variant="secondary"
          icon={Plus}
          onPress={() => {
            setPublished(null);
            setDetailsExpanded(null);
            requestAnimationFrame(() =>
              scrollRef.current?.scrollTo({ y: 0, animated: false }),
            );
          }}
        />
        <DemoNote text="Local demo publication, not shared with other devices and with no payment." />
      </Screen>
    );
  }

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
            <Txt tone="danger" size={12} accessibilityRole="alert">
              {errors.general}
            </Txt>
          )}
          <Button
            label={liveEnabled ? "Publish my offer" : "Publish my local offer"}
            icon={Plus}
            onPress={submit}
            loading={submitting}
            disabled={!ready || !draft.ready}
          />
          <Txt size={11} tone="muted" style={styles.centerText}>
            {liveEnabled
              ? "Visible to neighbours · no payment."
              : "Local publication · no payment."}
          </Txt>
        </View>
      }
    >
      <BackHeader title="Share my energy" />
      <StorageNotice />
      <View style={styles.intro}>
        <Txt size={25} weight="extrabold" accessibilityRole="header">
          Your surplus can brighten someone’s day.
        </Txt>
        <Txt size={13} tone="muted">
          The source, the welcome, then a word for your neighbours.
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
            Your offer has not been published yet.
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
      <View
        onLayout={(event) => {
          sectionY.current.source = event.nativeEvent.layout.y;
        }}
      >
        <Card>
          <SectionTitle title="1. Your energy source" />
          <View
            onLayout={(event) => {
              fieldY.current.title = event.nativeEvent.layout.y;
            }}
          >
            <Field
              ref={titleRef}
              label="Offer title"
              placeholder="A corner to charge and work"
              value={value.title}
              onChangeText={(next) => change("title", next)}
              maxLength={100}
              error={errors.title}
              returnKeyType="next"
              onSubmitEditing={() => capacityRef.current?.focus()}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Txt size={13} weight="bold">
              Offer neighbourhood
            </Txt>
            <ZonePicker
              value={value.zone}
              onChange={(next) => change("zone", next)}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Txt size={13} weight="bold">
              Energy source
            </Txt>
            <Chips
              value={value.source}
              onChange={(next) => change("source", next as EnergySource)}
              options={[
                { value: "solar", label: "Solar", icon: Sun },
                { value: "generator", label: "Generator", icon: PlugZap },
                { value: "battery", label: "Battery", icon: BatteryCharging },
              ]}
            />
          </View>
          <View
            onLayout={(event) => {
              fieldY.current.capacity = event.nativeEvent.layout.y;
            }}
          >
            <Field
              ref={capacityRef}
              label="Capacity and devices accepted"
              placeholder="2 kW · phones and laptops"
              value={value.capacity}
              onChangeText={(next) => change("capacity", next)}
              maxLength={100}
              error={errors.capacity}
              returnKeyType="next"
              onSubmitEditing={() => slotsRef.current?.focus()}
            />
          </View>
        </Card>
      </View>
      <View
        onLayout={(event) => {
          sectionY.current.welcome = event.nativeEvent.layout.y;
        }}
      >
        <Card>
          <SectionTitle title="2. Hosting conditions" />
          <View
            onLayout={(event) => {
              fieldY.current.slots = event.nativeEvent.layout.y;
              fieldY.current.until = event.nativeEvent.layout.y;
            }}
            style={styles.doubleField}
          >
            <View style={styles.flex}>
              <Field
                ref={slotsRef}
                label="Places (1 to 50)"
                value={value.slots}
                onChangeText={(next) => change("slots", next)}
                keyboardType="number-pad"
                maxLength={2}
                error={errors.slots}
                returnKeyType="next"
                onSubmitEditing={() => untilRef.current?.focus()}
              />
            </View>
            <View style={styles.flex}>
              <Field
                ref={untilRef}
                label="End · HH:mm"
                value={value.until}
                onChangeText={(next) => change("until", next)}
                placeholder="19:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                error={errors.until}
                returnKeyType="next"
                onSubmitEditing={() => priceRef.current?.focus()}
              />
            </View>
          </View>
          <View
            onLayout={(event) => {
              fieldY.current.price = event.nativeEvent.layout.y;
            }}
          >
            <Field
              ref={priceRef}
              label="Suggested contribution (GHS)"
              value={value.price}
              onChangeText={(next) => change("price", next)}
              keyboardType="decimal-pad"
              maxLength={7}
              error={errors.price}
              hint="0 GHS for free sharing. No payment in this demo."
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
        </Card>
      </View>
      <View
        onLayout={(event) => {
          sectionY.current.description = event.nativeEvent.layout.y;
        }}
      >
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="A word for your neighbours"
            accessibilityState={{ expanded }}
            onPress={() => {
              Keyboard.dismiss();
              setDetailsExpanded(!expanded);
            }}
            style={styles.optionalHeading}
          >
            <MessageSquare size={18} color={colors.muted} />
            <View style={styles.flex}>
              <Txt size={14} weight="bold">
                3. A word for your neighbours
              </Txt>
              <Txt size={11} tone="muted">
                Facultatif
                {value.description ? ` · ${value.description.length}/600` : ""}
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
              label="A word for your neighbours (optional)"
              placeholder="The space, the devices, the hosting conditions…"
              multiline
              value={value.description}
              onChangeText={(next) => change("description", next)}
              maxLength={600}
              error={errors.description}
              hint={`${value.description.length}/600 · No exact address needed.`}
            />
          )}
        </Card>
      </View>
      <DemoNote text="This offer stays on this device. The times refer to the demo scenario." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { gap: 7 },
  fieldGroup: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  doubleField: { flexDirection: "row", gap: 12 },
  optionalHeading: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
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
  centerText: { textAlign: "center" },
  successIntro: { alignItems: "center", gap: 17, paddingVertical: 14 },
  successIcon: {
    width: 87,
    height: 87,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 15,
  },
});
