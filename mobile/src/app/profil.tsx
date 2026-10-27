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
    liveEnabled,
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
    setMessage("Profile saved on this device.");
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
    setResetMessage("The demo is back to its initial settings and data.");
    void clearFormDrafts().catch(() => {
      setResetMessage(
        "The data has been reset. Some drafts could not be deleted from local storage.",
      );
    });
  }

  return (
    <>
      <Screen scrollRef={scrollRef}>
        <BackHeader title="My space" />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroEyebrow}>
              <Zap size={13} color="#132d39" />
              <Txt size={10} weight="extrabold" style={styles.navy}>
                YOUR ENERGY.
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
            accessibilityLabel="Edit my profile"
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
              Edit my profile
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
              Reports
            </Txt>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.line }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View my requests"
            onPress={() => showActivity("demandes")}
            style={styles.stat}
          >
            <Txt size={27} weight="extrabold" style={{ letterSpacing: -1 }}>
              {state.bookings.length}
            </Txt>
            <Txt size={10} tone="muted">
              Requests
            </Txt>
          </Pressable>
          <View
            style={[styles.statDivider, { backgroundColor: colors.line }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View my offers"
            onPress={() => showActivity("offres")}
            style={styles.stat}
          >
            <Txt size={27} weight="extrabold" style={{ letterSpacing: -1 }}>
              {ownedOffers.length}
            </Txt>
            <Txt size={10} tone="muted">
              Offers published
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
              Your energy links
            </Txt>
            <View style={[styles.smallBadge, { backgroundColor: colors.soft }]}>
              <Txt size={9} weight="bold" tone="muted">
                ON THIS DEVICE
              </Txt>
            </View>
          </View>
          <View style={[styles.segments, { backgroundColor: colors.soft }]}>
            {(["demandes", "offres"] as const).map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityLabel={
                  tab === "demandes" ? "My requests" : "My offers"
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
                  {tab === "demandes" ? "My requests" : "My offers"}
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
                    Your next energy stop
                  </Txt>
                  <Txt size={12} tone="muted">
                    A neighbour, a source, a helping hand. Your energy requests
                    appear here.
                  </Txt>
                </View>
                <Button
                  label="Discover offers"
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
                        SIMULATED REQUEST · PENDING
                      </Txt>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View the offer ${offer.title}`}
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
                          "en-GB",
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
                        The offer is currently unavailable. You can withdraw
                        your local request.
                      </Txt>
                    )}
                    <Button
                      label="Cancel this request"
                      icon={X}
                      variant="ghost"
                      onPress={async () => {
                        // Waits for the database before saying it is done (PAN's review of #9).
                        const error = await cancelRequest(booking.id);
                        setRequestMessage(
                          error ??
                            (liveEnabled
                              ? "Request cancelled."
                              : "Simulated request cancelled."),
                        );
                      }}
                    />
                  </Card>
                );
              })
            )}
            <Txt size={10} tone="muted" style={styles.localNote}>
              No host is contacted. No place is reserved.
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
                    Energy to share?
                  </Txt>
                  <Txt size={12} tone="muted">
                    Your source can become a neighbour’s energy stop. Find your
                    offers here, at your own pace.
                  </Txt>
                </View>
                <Button
                  label="Create my first offer"
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
                        ? "VISIBLE IN LOCAL OFFERS"
                        : "PAUSED · HIDDEN FROM LOCAL OFFERS"}
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Manage the offer ${offer.title}`}
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
                      offer.available ? "Pause this offer" : "Reopen this offer"
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
                            ? "Offer paused. It stays in My offers."
                            : "Offer reopened in the local offers."),
                      });
                    }}
                  />
                </Card>
              ))
            )}
            {ownedOffers.length > 0 && (
              <Button
                label="Publish another offer"
                icon={Plus}
                variant="ghost"
                onPress={() => router.push("/publier")}
              />
            )}
            <Txt size={10} tone="muted" style={styles.localNote}>
              Your offers stay on this device, with no remote publication.
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
            Your way
          </Txt>
          <Card style={styles.preferences}>
            <View style={styles.settingRow}>
              <Moon size={17} color={colors.muted} />
              <Txt size={13} weight="bold" style={styles.flex}>
                Appearance
              </Txt>
              <Txt size={10} tone="muted">
                {mode === "dark" ? "Night side" : "Sunny side"}
              </Txt>
            </View>
            <Chips
              value={mode}
              onChange={(value) =>
                setMode(value === "light" ? "light" : "dark")
              }
              options={[
                { value: "dark", label: "Dark", icon: Moon },
                { value: "light", label: "Light", icon: Sun },
              ]}
            />
            <View
              style={[styles.settingDivider, { backgroundColor: colors.line }]}
            />
            <View style={styles.settingRow}>
              <Bell size={17} color={colors.muted} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={13} weight="bold">
                  Demo alerts
                </Txt>
                <Txt size={10} tone="muted">
                  Local preference · no push
                </Txt>
              </View>
              <Switch
                accessibilityLabel="Turn on local demo alerts"
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
              Your data stays here.
            </Txt>
          </View>
          <Txt size={11} tone="muted">
            Profile, reports and activity on this device. No account created;
            the website’s data stays separate.
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
              accessibilityLabel="Reset the demo"
              accessibilityState={{ disabled: !ready }}
              disabled={!ready}
              onPress={() => setConfirmReset(true)}
              style={styles.resetRow}
            >
              <Trash2 size={15} color={colors.red} />
              <Txt size={12} style={{ flex: 1, color: colors.red }}>
                Reset the demo
              </Txt>
              <ChevronRight size={16} color={colors.red} />
            </Pressable>
          ) : (
            <View
              style={[styles.resetConfirmation, { borderColor: colors.red }]}
              accessibilityLiveRegion="polite"
            >
              <Txt size={16} weight="bold">
                Start from scratch?
              </Txt>
              <Txt size={12} tone="muted">
                Your contributions, offers, requests and drafts will be deleted.
                The profile and theme will return to their initial settings.
              </Txt>
              <Button
                label="Yes, reset"
                icon={Trash2}
                variant="danger"
                onPress={resetDemo}
              />
              <Button
                label="Keep my data"
                variant="secondary"
                onPress={() => setConfirmReset(false)}
              />
            </View>
          )}
        </View>
        <Txt size={10} tone="muted" style={styles.signature}>
          LightLink. Energy brings us together.
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
                  Keep your changes?
                </Txt>
                <Txt size={13} tone="muted">
                  Your name or neighbourhood has changed. Save your profile or
                  keep editing before leaving.
                </Txt>
                <Button
                  label="Save and leave"
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
                  label="Keep editing"
                  variant="secondary"
                  onPress={() => {
                    setEditing(true);
                    setLeaveAction(null);
                  }}
                />
                <Button
                  label="Leave without saving"
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
                      My profile
                    </Txt>
                    <Txt size={12} tone="muted">
                      A name, a neighbourhood. That’s all.
                    </Txt>
                  </View>
                  <IconButton
                    icon={X}
                    label="Close profile editing"
                    onPress={closeEditor}
                  />
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={styles.sheetContent}
                >
                  <Field
                    label="What should we call you?"
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      setError(null);
                    }}
                    placeholder="Your name"
                    maxLength={60}
                    autoCapitalize="words"
                    error={error ?? undefined}
                    onSubmitEditing={saveProfile}
                    returnKeyType="done"
                  />
                  <View style={{ gap: 9 }}>
                    <Txt size={13} weight="bold">
                      Your neighbourhood
                    </Txt>
                    <ZonePicker
                      value={zoneId}
                      onChange={(value) => {
                        setZoneId(value);
                        setError(null);
                      }}
                    />
                    <Txt size={11} tone="muted">
                      The dashboard and nearby offers will follow this
                      neighbourhood.
                    </Txt>
                  </View>
                  {changed && (
                    <Txt size={11} tone="muted">
                      Unsaved changes.
                    </Txt>
                  )}
                  <Button
                    label="Save my profile"
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
