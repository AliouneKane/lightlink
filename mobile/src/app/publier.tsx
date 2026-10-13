import { useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
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
  const { state, ready, createOffer } = useDemo();
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
  const [discarding, setDiscarding] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState<boolean | null>(null);
  const expanded = detailsExpanded ?? value.description.length > 0;
  const [published, setPublished] = useState<{
    value: OfferDraft;
    previousIds: string[];
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null);
  const capacityRef = useRef<TextInput>(null);
  const slotsRef = useRef<TextInput>(null);
  const untilRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
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

  function submit() {
    const nextErrors: Errors = {};
    if (value.title.trim().length < 3)
      nextErrors.title = "Donnez un titre d’au moins 3 caractères.";
    if (!value.capacity.trim())
      nextErrors.capacity = "Précisez la capacité et les appareils acceptés.";
    if (
      !/^\d+$/.test(value.slots) ||
      Number(value.slots) < 1 ||
      Number(value.slots) > 50
    )
      nextErrors.slots = "Indiquez entre 1 et 50 places.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.until))
      nextErrors.until = "Utilisez le format HH:mm, par exemple 19:00.";
    const price = Number(value.price.replace(",", "."));
    if (
      !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value.price.trim()) ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1000
    )
      nextErrors.price = "Indiquez un montant de 0 à 1 000 GHS.";
    setErrors(nextErrors);
    const first = (
      ["title", "capacity", "slots", "until", "price"] as InputKey[]
    ).find((key) => nextErrors[key]);
    if (first) {
      focusError(first);
      return;
    }
    Keyboard.dismiss();
    const result = createOffer({
      title: value.title,
      neighborhoodId: value.zone,
      source: value.source,
      capacity: value.capacity,
      price,
      slots: Number(value.slots),
      until: value.until,
      description: value.description,
    });
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
        <BackHeader title="Votre offre est prête" />
        <StorageNotice />
        <View style={styles.successIntro} accessibilityLiveRegion="polite">
          <View style={[styles.successIcon, { backgroundColor: colors.soft }]}>
            <CheckCircle2 size={42} color={colors.green} />
          </View>
          <Txt size={28} weight="extrabold" accessibilityRole="header">
            Une lumière de plus.
          </Txt>
          <Txt size={14} tone="muted" style={styles.centerText}>
            Votre offre est publiée sur cet appareil. Vous pourrez la retrouver
            et gérer sa disponibilité depuis votre espace.
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
          label="Voir mon offre"
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
          label="Partager une autre source"
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
        <DemoNote text="Publication locale de démonstration, sans diffusion à d’autres appareils et sans paiement." />
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
            label="Publier mon offre locale"
            icon={Plus}
            onPress={submit}
            disabled={!ready || !draft.ready}
          />
          <Txt size={11} tone="muted" style={styles.centerText}>
            Publication locale · aucun paiement.
          </Txt>
        </View>
      }
    >
      <BackHeader title="Partager mon énergie" />
      <StorageNotice />
      <View style={styles.intro}>
        <Txt size={25} weight="extrabold" accessibilityRole="header">
          Votre surplus peut éclairer la journée.
        </Txt>
        <Txt size={13} tone="muted">
          La source, l’accueil, puis un mot pour vos voisins.
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
            Votre offre n’a pas encore été publiée.
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
      <View
        onLayout={(event) => {
          sectionY.current.source = event.nativeEvent.layout.y;
        }}
      >
        <Card>
          <SectionTitle title="1. Votre source d’énergie" />
          <View
            onLayout={(event) => {
              fieldY.current.title = event.nativeEvent.layout.y;
            }}
          >
            <Field
              ref={titleRef}
              label="Titre de l’offre"
              placeholder="Un coin pour recharger et travailler"
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
              Quartier de l’offre
            </Txt>
            <ZonePicker
              value={value.zone}
              onChange={(next) => change("zone", next)}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Txt size={13} weight="bold">
              Source d’énergie
            </Txt>
            <Chips
              value={value.source}
              onChange={(next) => change("source", next as EnergySource)}
              options={[
                { value: "solar", label: "Solaire", icon: Sun },
                { value: "generator", label: "Générateur", icon: PlugZap },
                { value: "battery", label: "Batterie", icon: BatteryCharging },
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
              label="Capacité et appareils acceptés"
              placeholder="2 kW · téléphones et ordinateurs"
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
          <SectionTitle title="2. Les conditions d’accueil" />
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
                label="Places (1 à 50)"
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
                label="Fin · HH:mm"
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
              label="Contribution conseillée (GHS)"
              value={value.price}
              onChangeText={(next) => change("price", next)}
              keyboardType="decimal-pad"
              maxLength={7}
              error={errors.price}
              hint="0 GHS pour un partage gratuit. Aucun paiement dans cette démo."
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
            accessibilityLabel="Un mot pour vos voisins"
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
                3. Un mot pour vos voisins
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
              label="Un mot pour vos voisins (facultatif)"
              placeholder="L’espace, les appareils, les conditions d’accueil…"
              multiline
              value={value.description}
              onChangeText={(next) => change("description", next)}
              maxLength={600}
              error={errors.description}
              hint={`${value.description.length}/600 · Aucune adresse exacte nécessaire.`}
            />
          )}
        </Card>
      </View>
      <DemoNote text="Cette offre reste sur cet appareil. Les horaires concernent le scénario de démonstration." />
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
