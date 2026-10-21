import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowUpRight,
  BatteryCharging,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  HardDrive,
  MapPin,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  X,
  Zap,
} from "lucide-react-native";
import {
  BackHeader,
  Button,
  Card,
  Chips,
  Field,
  IconButton,
  Screen,
  Txt,
  ZonePicker,
  feedback,
} from "@/components/ui";
import { formatTime, initialState } from "@/lib/energy";
import { isOwnedOffer } from "@/lib/demo-repository";
import { clearFormDrafts } from "@/lib/use-form-draft";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";

type ActivityTab = "demandes" | "offres";

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const { colors, mode, setMode, resetTheme } = useTheme();
  const {
    state,
    ready,
    neighborhoods,
    storageError,
    updateProfile,
    setNotifications,
    cancelRequest,
    setOfferAvailability,
    reset,
  } = useDemo();
  const [name, setName] = useState(state.profile.name);
  const [zoneId, setZoneId] = useState(state.profile.neighborhoodId);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [activityTop, setActivityTop] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityTab>(
    section === "offres" ? "offres" : "demandes",
  );
  const [lastSection, setLastSection] = useState(section);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [offerFeedback, setOfferFeedback] = useState<{
    id: string;
    text: string;
    error: boolean;
  } | null>(null);
  const [savedProfile, setSavedProfile] = useState(state.profile);
  if (
    savedProfile.name !== state.profile.name ||
    savedProfile.neighborhoodId !== state.profile.neighborhoodId
  ) {
    setSavedProfile(state.profile);
    setName(state.profile.name);
    setZoneId(state.profile.neighborhoodId);
  }
  if (lastSection !== section) {
    setLastSection(section);
    if (section === "demandes" || section === "offres") setActiveTab(section);
  }

  const current = neighborhoods.find(
    (zone) => zone.id === state.profile.neighborhoodId,
  );
  const initials = state.profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const changed =
    name.trim() !== state.profile.name ||
    zoneId !== state.profile.neighborhoodId;
  const ownedOffers = state.offers.filter(
    (offer) => offer.own || isOwnedOffer(offer.id),
  );
  const contributions = state.reports.filter((report) =>
    report.id.startsWith("mobile-report-"),
  ).length;

  usePreventRemove(changed, ({ data }) => {
    setLeaveAction(() => () => navigation.dispatch(data.action));
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !changed) return;
    const preventRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventRefresh);
    return () => window.removeEventListener("beforeunload", preventRefresh);
  }, [changed]);
  useEffect(() => {
    if (
      (section === "demandes" || section === "offres") &&
      activityTop !== null
    )
      scrollRef.current?.scrollTo({
        y: Math.max(0, activityTop - 12),
        animated: false,
      });
  }, [section, activityTop]);

  function showActivity(tab: ActivityTab) {
    feedback();
    setActiveTab(tab);
    if (activityTop !== null)
      scrollRef.current?.scrollTo({
        y: Math.max(0, activityTop - 12),
        animated: !reducedMotion,
      });
  }
  function discardDraft() {
    setName(state.profile.name);
    setZoneId(state.profile.neighborhoodId);
    setError(null);
  }
  function closeEditor() {
    if (changed) {
      setLeaveAction(() => () => {
        setEditing(false);
      });
    } else setEditing(false);
  }
  function saveProfile() {
    const result = updateProfile({ name, neighborhoodId: zoneId });
    setError(result);
    if (result) return;
    setEditing(false);
    setMessage("Profil enregistré sur cet appareil.");
  }
  function resetDemo() {
    reset();
    resetTheme();
    setName(initialState.profile.name);
    setZoneId(initialState.profile.neighborhoodId);
    setEditing(false);
    setLeaveAction(null);
    setRequestMessage(null);
    setOfferFeedback(null);
    setMessage(null);
    setConfirmReset(false);
    setError(null);
    setResetMessage("La démo a retrouvé ses réglages et données de départ.");
    void clearFormDrafts().catch(() => {
      setResetMessage(
        "Les données ont été réinitialisées. Certains brouillons n’ont pas pu être effacés du stockage local.",
      );
    });
  }

  return (
    <>
      <Screen scrollRef={scrollRef}>
        <BackHeader title="Mon espace" />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroEyebrow}>
              <Zap size={13} color="#132d39" />
              <Txt size={10} weight="extrabold" style={styles.navy}>
                UNE ÉNERGIE À VOUS.
              </Txt>
            </View>
            <View style={styles.localBadge}>
              <HardDrive size={11} color="#132d39" />
              <Txt size={9} weight="bold" style={styles.navy}>
                LOCAL
              </Txt>
            </View>
          </View>
          <View style={styles.identity}>
            <View style={styles.identityCopy}>
              <Txt
                size={30}
                weight="extrabold"
                accessibilityRole="header"
                style={[styles.navy, styles.name]}
              >
                {state.profile.name}
              </Txt>
              <View style={styles.location}>
                <MapPin size={14} color="#344b52" />
                <Txt
                  size={12}
                  weight="medium"
                  style={{ color: "#344b52", flex: 1 }}
                >
                  {current?.name} · Accra
                </Txt>
              </View>
            </View>
            <View style={styles.monogramRing}>
              <View style={styles.monogram}>
                <Txt
                  size={25}
                  weight="extrabold"
                  style={{ color: "#facb4c", letterSpacing: -1 }}
                >
                  {initials}
                </Txt>
              </View>
              <View style={styles.monogramSpark}>
                <Zap size={12} color="#132d39" fill="#132d39" />
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Modifier mon profil"
            onPress={() => {
              feedback();
              discardDraft();
              setMessage(null);
              setEditing(true);
            }}
            style={({ pressed }) => [
              styles.editButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Pencil size={16} color="#facb4c" />
            <Txt size={13} weight="bold" style={{ color: "#fff", flex: 1 }}>
              Modifier mon profil
            </Txt>
            <ArrowUpRight size={19} color="#facb4c" />
          </Pressable>
        </View>

        {message && (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.feedback, { backgroundColor: colors.soft }]}
          >
            <Check size={16} color={colors.green} />
            <Txt size={12} style={styles.flex}>
              {message}
            </Txt>
          </View>
        )}

        <View
          style={[
            styles.stats,
            { backgroundColor: colors.surface, borderColor: colors.line },
          ]}
        >
          <View style={styles.stat}>
            <Txt size={27} weight="extrabold" style={{ letterSpacing: -1 }}>
              {contributions}
            </Txt>
            <Txt size={10} tone="muted">
              Signalements
            </Txt>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.line }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mes demandes"
            onPress={() => showActivity("demandes")}
            style={styles.stat}
          >
            <Txt size={27} weight="extrabold" style={{ letterSpacing: -1 }}>
              {state.bookings.length}
            </Txt>
            <Txt size={10} tone="muted">
              Demandes
            </Txt>
          </Pressable>
          <View
            style={[styles.statDivider, { backgroundColor: colors.line }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mes offres"
            onPress={() => showActivity("offres")}
            style={styles.stat}
          >
            <Txt size={27} weight="extrabold" style={{ letterSpacing: -1 }}>
              {ownedOffers.length}
            </Txt>
            <Txt size={10} tone="muted">
              Offres publiées
            </Txt>
          </Pressable>
        </View>

        <View
          onLayout={(event) => setActivityTop(event.nativeEvent.layout.y)}
          style={styles.activityHeader}
        >
          <View style={styles.sectionHeading}>
            <Txt
              size={21}
              weight="extrabold"
              accessibilityRole="header"
              style={{ letterSpacing: -0.6 }}
            >
              Vos liens d’énergie
            </Txt>
            <View style={[styles.smallBadge, { backgroundColor: colors.soft }]}>
              <Txt size={9} weight="bold" tone="muted">
                SUR CET APPAREIL
              </Txt>
            </View>
          </View>
          <View style={[styles.segments, { backgroundColor: colors.soft }]}>
            {(["demandes", "offres"] as const).map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityLabel={
                  tab === "demandes" ? "Mes demandes" : "Mes offres"
                }
                accessibilityState={{ selected: activeTab === tab }}
                onPress={() => {
                  feedback();
                  setActiveTab(tab);
                }}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      activeTab === tab ? colors.yellow : "transparent",
                  },
                ]}
              >
                <Txt
                  size={12}
                  weight="bold"
                  style={{
                    color: activeTab === tab ? colors.navy : colors.muted,
                  }}
                >
                  {tab === "demandes" ? "Mes demandes" : "Mes offres"}
                </Txt>
                <View
                  style={[
                    styles.segmentCount,
                    {
                      backgroundColor:
                        activeTab === tab
                          ? "rgba(19,45,57,0.1)"
                          : colors.raised,
                    },
                  ]}
                >
                  <Txt
                    size={10}
                    weight="bold"
                    style={{
                      color: activeTab === tab ? colors.navy : colors.muted,
                    }}
                  >
                    {tab === "demandes"
                      ? state.bookings.length
                      : ownedOffers.length}
                  </Txt>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {activeTab === "demandes" ? (
          <View style={styles.activityContent}>
            {requestMessage && (
              <Txt
                size={12}
                accessibilityLiveRegion="polite"
                style={{ color: colors.green }}
              >
                {requestMessage}
              </Txt>
            )}
            {state.bookings.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: colors.yellow }]}
                >
                  <BatteryCharging
                    size={27}
                    color={colors.navy}
                    strokeWidth={1.6}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Txt
                    size={20}
                    weight="extrabold"
                    style={{ letterSpacing: -0.5 }}
                  >
                    Votre prochain relais énergie
                  </Txt>
                  <Txt size={12} tone="muted">
                    Un voisin, une source, un petit coup de main. Vos demandes
                    d’énergie se retrouvent ici.
                  </Txt>
                </View>
                <Button
                  label="Découvrir les offres"
                  icon={ArrowUpRight}
                  variant="secondary"
                  onPress={() => router.push("/(tabs)/partage")}
                />
              </Card>
            ) : (
              state.bookings.map((booking) => {
                const offer = state.offers.find(
                  (item) => item.id === booking.offerId,
                );
                if (!offer) return null;
                return (
                  <Card key={booking.id} style={styles.activityCard}>
                    <View style={styles.statusRow}>
                      <View
                        style={[styles.dot, { backgroundColor: colors.amber }]}
                      />
                      <Txt
                        size={10}
                        weight="bold"
                        style={{ color: colors.amber }}
                      >
                        DEMANDE SIMULÉE · EN ATTENTE
                      </Txt>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Voir l’offre ${offer.title}`}
                      onPress={() =>
                        router.push({
                          pathname: "/offre/[id]",
                          params: {
                            id: offer.id,
                            zone: state.profile.neighborhoodId,
                          },
                        })
                      }
                      style={styles.offerLink}
                    >
                      <View style={{ flex: 1, gap: 5 }}>
                        <Txt
                          size={17}
                          weight="bold"
                          style={{ letterSpacing: -0.3 }}
                        >
                          {offer.title}
                        </Txt>
                        <Txt size={12} tone="muted">
                          {offer.host} ·{" "}
                          {
                            neighborhoods.find(
                              (zone) => zone.id === offer.neighborhoodId,
                            )?.name
                          }
                        </Txt>
                      </View>
                      <ChevronRight size={19} color={colors.muted} />
                    </Pressable>
                    <View
                      style={[styles.cardBottom, { borderColor: colors.line }]}
                    >
                      <Clock3 size={12} color={colors.muted} />
                      <Txt size={10} tone="muted" style={styles.flex}>
                        {new Date(booking.createdAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "Africa/Accra",
                          },
                        )}{" "}
                        · {formatTime(booking.createdAt)} GMT
                      </Txt>
                    </View>
                    {!offer.available && (
                      <Txt size={12} tone="danger">
                        L’offre est actuellement indisponible. Vous pouvez
                        retirer votre demande locale.
                      </Txt>
                    )}
                    <Button
                      label="Annuler cette demande"
                      icon={X}
                      variant="ghost"
                      onPress={() => {
                        cancelRequest(booking.id);
                        setRequestMessage("Demande simulée annulée.");
                      }}
                    />
                  </Card>
                );
              })
            )}
            <Txt size={10} tone="muted" style={styles.localNote}>
              Aucun hôte n’est contacté. Aucune place n’est réservée.
            </Txt>
          </View>
        ) : (
          <View style={styles.activityContent}>
            {ownedOffers.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: colors.yellow }]}
                >
                  <Zap size={26} color={colors.navy} strokeWidth={1.6} />
                </View>
                <View style={{ gap: 6 }}>
                  <Txt
                    size={20}
                    weight="extrabold"
                    style={{ letterSpacing: -0.5 }}
                  >
                    De l’énergie à partager ?
                  </Txt>
                  <Txt size={12} tone="muted">
                    Votre source peut devenir le relais d’un voisin. Retrouvez
                    vos offres ici, à votre rythme.
                  </Txt>
                </View>
                <Button
                  label="Créer ma première offre"
                  icon={Plus}
                  variant="secondary"
                  onPress={() => router.push("/publier")}
                />
              </Card>
            ) : (
              ownedOffers.map((offer) => (
                <Card key={offer.id} style={styles.activityCard}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: offer.available
                            ? colors.green
                            : colors.amber,
                        },
                      ]}
                    />
                    <Txt
                      size={10}
                      weight="bold"
                      style={{
                        color: offer.available ? colors.green : colors.amber,
                      }}
                    >
                      {offer.available
                        ? "VISIBLE DANS LES OFFRES LOCALES"
                        : "SUSPENDUE · MASQUÉE DES OFFRES LOCALES"}
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Gérer l’offre ${offer.title}`}
                    style={styles.offerLink}
                    onPress={() =>
                      router.push({
                        pathname: "/offre/[id]",
                        params: { id: offer.id },
                      })
                    }
                  >
                    <View style={{ flex: 1, gap: 5 }}>
                      <Txt
                        size={17}
                        weight="bold"
                        style={{ letterSpacing: -0.3 }}
                      >
                        {offer.title}
                      </Txt>
                      <Txt size={12} tone="muted">
                        {
                          neighborhoods.find(
                            (zone) => zone.id === offer.neighborhoodId,
                          )?.name
                        }{" "}
                        · {offer.slots} place{offer.slots === 1 ? "" : "s"}
                      </Txt>
                    </View>
                    <ChevronRight size={19} color={colors.muted} />
                  </Pressable>
                  {offerFeedback?.id === offer.id && (
                    <Txt
                      size={12}
                      tone={offerFeedback.error ? "danger" : "default"}
                      accessibilityLiveRegion="polite"
                    >
                      {offerFeedback.text}
                    </Txt>
                  )}
                  <Button
                    label={
                      offer.available
                        ? "Suspendre cette offre"
                        : "Réactiver cette offre"
                    }
                    icon={offer.available ? Pause : Play}
                    variant="secondary"
                    disabled={!ready}
                    onPress={async () => {
                      const result = await setOfferAvailability(
                        offer.id,
                        !offer.available,
                      );
                      setOfferFeedback({
                        id: offer.id,
                        error: !!result,
                        text:
                          result ??
                          (offer.available
                            ? "Offre suspendue. Elle reste dans Mes offres."
                            : "Offre réactivée dans les offres locales."),
                      });
                    }}
                  />
                </Card>
              ))
            )}
            {ownedOffers.length > 0 && (
              <Button
                label="Publier une autre offre"
                icon={Plus}
                variant="ghost"
                onPress={() => router.push("/publier")}
              />
            )}
            <Txt size={10} tone="muted" style={styles.localNote}>
              Vos offres restent sur cet appareil, sans publication distante.
            </Txt>
          </View>
        )}

        <View style={{ gap: 13 }}>
          <Txt
            size={20}
            weight="extrabold"
            accessibilityRole="header"
            style={{ letterSpacing: -0.5 }}
          >
            À votre façon
          </Txt>
          <Card style={styles.preferences}>
            <View style={styles.settingRow}>
              <Moon size={17} color={colors.muted} />
              <Txt size={13} weight="bold" style={styles.flex}>
                Apparence
              </Txt>
              <Txt size={10} tone="muted">
                {mode === "dark" ? "Côté nuit" : "Côté soleil"}
              </Txt>
            </View>
            <Chips
              value={mode}
              onChange={(value) =>
                setMode(value === "light" ? "light" : "dark")
              }
              options={[
                { value: "dark", label: "Sombre", icon: Moon },
                { value: "light", label: "Clair", icon: Sun },
              ]}
            />
            <View
              style={[styles.settingDivider, { backgroundColor: colors.line }]}
            />
            <View style={styles.settingRow}>
              <Bell size={17} color={colors.muted} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={13} weight="bold">
                  Alertes de démonstration
                </Txt>
                <Txt size={10} tone="muted">
                  Préférence locale · aucun push
                </Txt>
              </View>
              <Switch
                accessibilityLabel="Activer les alertes locales de démonstration"
                value={state.notificationsEnabled}
                disabled={!ready}
                onValueChange={setNotifications}
                trackColor={{ false: colors.line, true: colors.yellow }}
                thumbColor={
                  state.notificationsEnabled ? colors.navy : colors.muted
                }
                ios_backgroundColor={colors.line}
              />
            </View>
          </Card>
        </View>

        <View style={[styles.dataPanel, { borderColor: colors.line }]}>
          <View style={styles.settingRow}>
            <ShieldCheck size={18} color={colors.muted} />
            <Txt size={13} weight="bold" style={styles.flex}>
              Vos données restent ici.
            </Txt>
          </View>
          <Txt size={11} tone="muted">
            Profil, signalements et activité sur cet appareil. Aucun compte créé
            ; les données du site web restent indépendantes.
          </Txt>
          {storageError && (
            <Txt size={11} tone="danger" accessibilityRole="alert">
              {storageError}
            </Txt>
          )}
          {resetMessage && (
            <Txt size={12} accessibilityLiveRegion="polite">
              {resetMessage}
            </Txt>
          )}
          {!confirmReset ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réinitialiser la démo"
              accessibilityState={{ disabled: !ready }}
              disabled={!ready}
              onPress={() => setConfirmReset(true)}
              style={styles.resetRow}
            >
              <Trash2 size={15} color={colors.red} />
              <Txt size={12} style={{ flex: 1, color: colors.red }}>
                Réinitialiser la démo
              </Txt>
              <ChevronRight size={16} color={colors.red} />
            </Pressable>
          ) : (
            <View
              style={[styles.resetConfirmation, { borderColor: colors.red }]}
              accessibilityLiveRegion="polite"
            >
              <Txt size={16} weight="bold">
                Repartir de zéro ?
              </Txt>
              <Txt size={12} tone="muted">
                Vos contributions, offres, demandes et brouillons seront
                supprimés. Le profil et le thème retrouveront leurs réglages de
                départ.
              </Txt>
              <Button
                label="Oui, réinitialiser"
                icon={Trash2}
                variant="danger"
                onPress={resetDemo}
              />
              <Button
                label="Conserver mes données"
                variant="secondary"
                onPress={() => setConfirmReset(false)}
              />
            </View>
          )}
        </View>
        <Txt size={10} tone="muted" style={styles.signature}>
          LightLink. L’énergie nous rapproche.
        </Txt>
      </Screen>

      <Modal
        transparent
        visible={editing || leaveAction !== null}
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={() =>
          leaveAction ? setLeaveAction(null) : closeEditor()
        }
      >
        <KeyboardAvoidingView
          style={styles.sheetBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessible={false}
            onPress={() => (leaveAction ? setLeaveAction(null) : closeEditor())}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.canvas,
                borderColor: colors.line,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.line }]}
            />
            {leaveAction ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetContent}
              >
                <Txt
                  size={24}
                  weight="extrabold"
                  accessibilityRole="header"
                  style={{ letterSpacing: -0.7 }}
                >
                  Garder vos modifications ?
                </Txt>
                <Txt size={13} tone="muted">
                  Votre nom ou votre quartier a changé. Enregistrez votre profil
                  ou poursuivez la modification avant de quitter.
                </Txt>
                <Button
                  label="Enregistrer et quitter"
                  icon={Save}
                  onPress={() => {
                    const result = updateProfile({
                      name,
                      neighborhoodId: zoneId,
                    });
                    setError(result);
                    if (result) {
                      setEditing(true);
                      setLeaveAction(null);
                      return;
                    }
                    leaveAction();
                    setLeaveAction(null);
                    setEditing(false);
                  }}
                />
                <Button
                  label="Continuer à modifier"
                  variant="secondary"
                  onPress={() => {
                    setEditing(true);
                    setLeaveAction(null);
                  }}
                />
                <Button
                  label="Quitter sans enregistrer"
                  variant="ghost"
                  onPress={() => {
                    leaveAction();
                    discardDraft();
                    setLeaveAction(null);
                    setEditing(false);
                  }}
                />
              </ScrollView>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt
                      size={24}
                      weight="extrabold"
                      accessibilityRole="header"
                      style={{ letterSpacing: -0.7 }}
                    >
                      Mon profil
                    </Txt>
                    <Txt size={12} tone="muted">
                      Un nom, un quartier. C’est tout.
                    </Txt>
                  </View>
                  <IconButton
                    icon={X}
                    label="Fermer la modification du profil"
                    onPress={closeEditor}
                  />
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={styles.sheetContent}
                >
                  <Field
                    label="Comment vous appeler ?"
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      setError(null);
                    }}
                    placeholder="Votre nom"
                    maxLength={60}
                    autoCapitalize="words"
                    error={error ?? undefined}
                    onSubmitEditing={saveProfile}
                    returnKeyType="done"
                  />
                  <View style={{ gap: 9 }}>
                    <Txt size={13} weight="bold">
                      Votre quartier
                    </Txt>
                    <ZonePicker
                      value={zoneId}
                      onChange={(value) => {
                        setZoneId(value);
                        setError(null);
                      }}
                    />
                    <Txt size={11} tone="muted">
                      Le tableau de bord et les offres proches suivront ce
                      quartier.
                    </Txt>
                  </View>
                  {changed && (
                    <Txt size={11} tone="muted">
                      Modifications non enregistrées.
                    </Txt>
                  )}
                  <Button
                    label="Enregistrer mon profil"
                    icon={Save}
                    onPress={saveProfile}
                    disabled={!ready || !changed}
                  />
                </ScrollView>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navy: { color: "#132d39" },
  hero: {
    backgroundColor: "#facb4c",
    borderRadius: 28,
    padding: 21,
    gap: 22,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroEyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
  localBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(19,45,57,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityCopy: { flex: 1, gap: 9 },
  name: { lineHeight: 36, letterSpacing: -1.1 },
  location: { flexDirection: "row", alignItems: "center", gap: 5 },
  monogramRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(19,45,57,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    width: 73,
    height: 73,
    borderRadius: 37,
    backgroundColor: "#132d39",
    alignItems: "center",
    justifyContent: "center",
  },
  monogramSpark: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#facb4c",
    borderWidth: 2,
    borderColor: "#132d39",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    minHeight: 49,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: "#132d39",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
    borderRadius: 14,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 21,
    paddingVertical: 15,
    paddingHorizontal: 6,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    minHeight: 55,
  },
  statDivider: { width: 1, height: 33 },
  activityHeader: { gap: 15 },
  sectionHeading: { gap: 7 },
  smallBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  segments: { flexDirection: "row", padding: 5, gap: 4, borderRadius: 18 },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 44,
    borderRadius: 13,
    paddingHorizontal: 7,
    paddingVertical: 9,
  },
  segmentCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 7,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: { gap: 13, marginTop: -7 },
  emptyCard: { padding: 20, gap: 18 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  activityCard: { gap: 13, padding: 18 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  offerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  localNote: { textAlign: "center", paddingHorizontal: 9, lineHeight: 16 },
  preferences: { gap: 14, padding: 18 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingDivider: { height: StyleSheet.hairlineWidth },
  dataPanel: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 11 },
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 44,
    marginBottom: -5,
  },
  resetConfirmation: { gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  signature: { textAlign: "center", paddingBottom: 2 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5,15,22,0.72)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "92%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  sheetContent: { padding: 22, gap: 20 },
});
