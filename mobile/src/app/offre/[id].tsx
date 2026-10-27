import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react-native";
import {
  Button,
  Card,
  DemoNote,
  IconButton,
  Screen,
  StorageNotice,
  Txt,
} from "@/components/ui";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";
import { distanceKm, neighborhoods, requestStatusLabels } from "@/lib/energy";
import { isOwnedOffer } from "@/lib/demo-repository";
import { sourceMeta } from "@/lib/theme";

export default function OfferDetail() {
  const { id, zone } = useLocalSearchParams<{ id: string; zone?: string }>();
  return <OfferContent key={id} id={id} zone={zone} />;
}
function OfferContent({ id, zone }: { id: string; zone?: string }) {
  const {
    state,
    ready,
    requestOffer,
    cancelRequest,
    setOfferAvailability,
    liveEnabled,
    incomingRequests,
    answerRequest,
    reportAbuse,
  } = useDemo();
  const [abuseOpen, setAbuseOpen] = useState(false);
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const offer = state.offers.find((item) => item.id === id);
  const booking = state.bookings.find((item) => item.offerId === id);

  if (!offer)
    return (
      <Screen title="Offer unavailable">
        <Card>
          <Txt>This offer is no longer in this device’s data.</Txt>
          <Button
            label="View offers"
            onPress={() => router.replace("/partage")}
          />
        </Card>
      </Screen>
    );

  const meta = sourceMeta[offer.source];
  const origin =
    neighborhoods.find((item) => item.id === zone) ??
    neighborhoods.find((item) => item.id === state.profile.neighborhoodId)!;
  const location = neighborhoods.find(
    (item) => item.id === offer.neighborhoodId,
  )!;
  const distance = distanceKm(origin.lat, origin.lng, offer.lat, offer.lng);
  const own = Boolean(offer.own) || isOwnedOffer(offer.id);
  // Live mode: a finished, refused or cancelled request no longer blocks a new one.
  const activeBooking =
    booking &&
    (!booking.status || ["pending", "accepted"].includes(booking.status))
      ? booking
      : undefined;
  const requestsHere = incomingRequests.filter(
    (item) => item.offerId === offer.id,
  );
  const available = offer.available && offer.slots > 0;

  // Waits for the database before confirming anything (PAN's review of #9, point 1).
  async function act() {
    setError(null);
    setMessage(null);
    if (!offer) return;
    if (own) {
      const result = await setOfferAvailability(offer.id, !offer.available);
      setError(result);
      if (!result)
        setMessage(
          offer.available
            ? "Offer paused. Find it in My offers."
            : "Offer reopened in the local offers.",
        );
    } else if (activeBooking) {
      const result = await cancelRequest(activeBooking.id);
      setError(result);
      if (!result)
        setMessage(
          liveEnabled ? "Request cancelled." : "Simulated request cancelled.",
        );
    } else {
      const result = await requestOffer(offer.id);
      setError(result);
      if (!result && liveEnabled) setMessage("Request sent to the host.");
    }
  }

  return (
    <Screen
      footer={
        <View style={[styles.footer, { borderColor: colors.line }]}>
          <View style={styles.priceRow}>
            <View style={styles.priceValue}>
              <Txt size={25} weight="extrabold">
                {offer.price === 0 ? "Free" : offer.price}
              </Txt>
              {offer.price !== 0 && (
                <Txt size={12} tone="muted">
                  GHS
                </Txt>
              )}
            </View>
            <Txt size={11} tone="muted" style={styles.priceCaption}>
              {own
                ? offer.available
                  ? "Your offer is visible"
                  : "Your offer is paused"
                : activeBooking
                  ? liveEnabled && activeBooking.status
                    ? requestStatusLabels[activeBooking.status]
                    : "Local request pending"
                  : "Suggested contribution"}
            </Txt>
          </View>
          {(error || message) && (
            <Txt
              size={12}
              tone={error ? "danger" : "default"}
              accessibilityRole={error ? "alert" : undefined}
              accessibilityLiveRegion="polite"
            >
              {error ?? message}
            </Txt>
          )}
          <Button
            label={
              own
                ? offer.available
                  ? "Pause my offer"
                  : "Reopen my offer"
                : activeBooking
                  ? "Cancel my request"
                  : available
                    ? liveEnabled
                      ? "Request a place"
                      : "Simulate a request"
                    : "Offer unavailable"
            }
            icon={
              own
                ? offer.available
                  ? Pause
                  : Play
                : activeBooking
                  ? undefined
                  : ArrowUpRight
            }
            variant={
              activeBooking || (own && offer.available)
                ? "secondary"
                : "primary"
            }
            disabled={!ready || (!own && !activeBooking && !available)}
            onPress={act}
          />
        </View>
      }
    >
      <View style={[styles.hero, { borderColor: colors.line }]}>
        <Image
          source={
            offer.source === "solar"
              ? require("../../../assets/solar.webp")
              : offer.source === "generator"
                ? require("../../../assets/generator.webp")
                : require("../../../assets/battery.webp")
          }
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={`${meta.label} illustration`}
        />
        <LinearGradient
          colors={[
            "rgba(6,22,29,0.12)",
            "rgba(6,22,29,0.28)",
            "rgba(6,22,29,0.95)",
          ]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroHeader}>
          <IconButton
            icon={ArrowLeft}
            label="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/partage")
            }
          />
          <View style={styles.heroBadge}>
            <ShieldCheck size={12} color="#facb4c" />
            <Txt size={10} weight="bold" style={{ color: "#fff" }}>
              {own
                ? liveEnabled
                  ? "YOUR OFFER"
                  : "YOUR LOCAL OFFER"
                : "BETWEEN NEIGHBOURS"}
            </Txt>
          </View>
        </View>
        <View style={styles.heroTitle}>
          <View style={styles.heroSource}>
            <meta.icon size={16} color="#facb4c" />
            <Txt size={11} weight="bold" style={{ color: "#facb4c" }}>
              {meta.label.toLocaleUpperCase("en")}
            </Txt>
          </View>
          <Txt
            size={28}
            weight="extrabold"
            accessibilityRole="header"
            style={{ color: "#fff", lineHeight: 35 }}
          >
            {offer.title}
          </Txt>
          <View style={styles.location}>
            <MapPin size={13} color="#d3dee3" />
            <Txt size={12} style={{ color: "#d3dee3", flex: 1 }}>
              {location.name} ·{" "}
              {distance < 0.1
                ? `in ${origin.name}`
                : `${distance.toFixed(1)} km from ${origin.name}`}
            </Txt>
          </View>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: available ? colors.green : colors.amber },
          ]}
        />
        <Txt
          size={12}
          weight="bold"
          style={{ color: available ? colors.green : colors.amber }}
        >
          {available
            ? liveEnabled
              ? "Available"
              : "Available in this scenario"
            : own
              ? "Offer paused"
              : "Currently unavailable"}
        </Txt>
      </View>
      {booking && liveEnabled && booking.status && (
        <Card>
          <View style={styles.statusRow}>
            <CheckCircle2 size={20} color={colors.green} />
            <Txt weight="bold" style={{ color: colors.green, flex: 1 }}>
              Your request: {requestStatusLabels[booking.status].toLowerCase()}
            </Txt>
          </View>
          <Txt size={12} tone="muted">
            {booking.status === "accepted" || booking.status === "finished"
              ? booking.address
                ? `Address given by the host: ${booking.address}`
                : "The host gave no exact address: get in touch with them in the neighbourhood."
              : booking.status === "pending"
                ? "The host has been notified. The exact address will appear if they accept."
                : "This request is closed."}
          </Txt>
          {booking.status === "accepted" && (
            <Button
              label="Finish: I got my energy"
              variant="secondary"
              onPress={() => answerRequest(booking.id, "finished")}
            />
          )}
        </Card>
      )}
      {own && liveEnabled && (
        <Card>
          <Txt weight="bold">Requests received ({requestsHere.length})</Txt>
          {requestsHere.length === 0 && (
            <Txt size={12} tone="muted">
              No requests for now. You will be notified as soon as a neighbour
              makes one.
            </Txt>
          )}
          {requestsHere.map((item) => (
            <View key={item.id} style={styles.requestRow}>
              <Txt size={12} style={{ flex: 1 }}>
                {new Date(item.createdAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Africa/Accra",
                })}{" "}
                · {requestStatusLabels[item.status]}
                {item.message ? ` · “${item.message}”` : ""}
              </Txt>
              {item.status === "pending" && (
                <>
                  <Button
                    label="Accept"
                    onPress={() => answerRequest(item.id, "accepted")}
                  />
                  <Button
                    label="Decline"
                    variant="secondary"
                    onPress={() => answerRequest(item.id, "refused")}
                  />
                </>
              )}
              {item.status === "accepted" && (
                <Button
                  label="Finish"
                  variant="secondary"
                  onPress={() => answerRequest(item.id, "finished")}
                />
              )}
            </View>
          ))}
        </Card>
      )}
      {!own && liveEnabled && (
        <Card>
          {abuseOpen ? (
            <>
              <Txt weight="bold">What is the problem?</Txt>
              {[
                "Unfair price",
                "Misleading or fake offer",
                "Inappropriate behaviour",
              ].map((reason) => (
                <Button
                  key={reason}
                  label={reason}
                  variant="secondary"
                  onPress={() => {
                    reportAbuse(offer.id, reason);
                    setAbuseOpen(false);
                    setMessage(
                      "Thank you, the LightLink team will review this offer.",
                    );
                  }}
                />
              ))}
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setAbuseOpen(false)}
              />
            </>
          ) : (
            <Button
              label="Report this offer"
              variant="ghost"
              onPress={() => setAbuseOpen(true)}
            />
          )}
        </Card>
      )}
      {booking && !liveEnabled && (
        <Card>
          <View style={styles.statusRow}>
            <CheckCircle2 size={20} color={colors.green} />
            <Txt weight="bold" style={{ color: colors.green, flex: 1 }}>
              Simulated request saved
            </Txt>
          </View>
          <Txt size={12} tone="muted">
            Pending on this device. No message was sent to the host and no place
            was reserved.
          </Txt>
          <Button
            label="View my requests"
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/profil",
                params: { section: "demandes" },
              })
            }
          />
        </Card>
      )}

      <Card>
        <View style={styles.hostRow}>
          <View style={[styles.avatar, { backgroundColor: colors.yellow }]}>
            <Txt size={18} weight="extrabold" style={{ color: colors.navy }}>
              {offer.initials}
            </Txt>
          </View>
          <View style={{ gap: 2, flex: 1 }}>
            <Txt size={16} weight="bold">
              {offer.host}
            </Txt>
            <Txt size={11} tone="muted">
              {own
                ? "Your contribution to the neighbourhood"
                : liveEnabled
                  ? "Your neighbour"
                  : "Your neighbour in this scenario"}
            </Txt>
          </View>
          <View style={[styles.hostBadge, { backgroundColor: colors.soft }]}>
            <ShieldCheck size={18} color={colors.muted} />
          </View>
        </View>
        <Txt size={14} tone="muted" style={{ lineHeight: 23 }}>
          {offer.description}
        </Txt>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <View style={styles.facts}>
          <View style={[styles.fact, { backgroundColor: colors.soft }]}>
            <Users size={19} color={colors.accent} />
            <Txt size={16} weight="bold">
              {offer.slots} place{offer.slots === 1 ? "" : "s"}
            </Txt>
            <Txt size={10} tone="muted">
              in the scenario
            </Txt>
          </View>
          <View style={[styles.fact, { backgroundColor: colors.soft }]}>
            <Clock3 size={19} color={colors.accent} />
            <Txt size={16} weight="bold">
              Until {offer.until}
            </Txt>
            <Txt size={10} tone="muted">
              scenario time
            </Txt>
          </View>
        </View>
        <View style={styles.location}>
          <Zap size={16} color={colors.accent} />
          <Txt size={12} style={{ flex: 1 }}>
            {offer.capacity}
          </Txt>
        </View>
      </Card>

      {own && (
        <Card>
          <Txt size={16} weight="bold">
            You stay in control.
          </Txt>
          <Txt size={13} tone="muted">
            You published this offer.
          </Txt>
          <Txt size={13} tone="muted">
            Pause your offer to hide it from the available offers on this
            device. You can reopen it from this page or My offers.
          </Txt>
          <Button
            label="View my offers"
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/profil",
                params: { section: "offres" },
              })
            }
          />
        </Card>
      )}
      <StorageNotice />
      <View style={styles.privacy}>
        <ShieldCheck color={colors.muted} size={18} />
        <Txt tone="muted" size={11} style={{ flex: 1 }}>
          Location at the neighbourhood centre. No private address is shown.
        </Txt>
      </View>
      <DemoNote text="Local demo offer. No host is contacted, no payment is collected and no remote acceptance is simulated." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  requestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  hero: {
    minHeight: 320,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    justifyContent: "space-between",
  },
  heroHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroBadge: {
    backgroundColor: "rgba(8,26,34,0.64)",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroTitle: { padding: 23, gap: 11, paddingTop: 35 },
  heroSource: { flexDirection: "row", gap: 7, alignItems: "center" },
  location: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { height: 7, width: 7, borderRadius: 4 },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    height: 49,
    width: 49,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hostBadge: {
    height: 34,
    width: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, marginVertical: 3 },
  facts: { flexDirection: "row", gap: 10 },
  fact: { flex: 1, borderRadius: 17, padding: 13, gap: 5 },
  privacy: { flexDirection: "row", gap: 10 },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 11,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  priceRow: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceValue: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  priceCaption: { flex: 1, textAlign: "right" },
});
