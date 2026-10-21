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
      <Screen title="Offre indisponible">
        <Card>
          <Txt>Cette offre n’est plus dans les données de cet appareil.</Txt>
          <Button
            label="Voir les offres"
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
            ? "Offre suspendue. Retrouvez-la dans Mes offres."
            : "Offre réactivée dans les offres locales.",
        );
    } else if (activeBooking) {
      const result = await cancelRequest(activeBooking.id);
      setError(result);
      if (!result)
        setMessage(
          liveEnabled ? "Demande annulée." : "Demande simulée annulée.",
        );
    } else {
      const result = await requestOffer(offer.id);
      setError(result);
      if (!result && liveEnabled) setMessage("Demande envoyée à l’hôte.");
    }
  }

  return (
    <Screen
      footer={
        <View style={[styles.footer, { borderColor: colors.line }]}>
          <View style={styles.priceRow}>
            <View style={styles.priceValue}>
              <Txt size={25} weight="extrabold">
                {offer.price === 0 ? "Gratuit" : offer.price}
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
                  ? "Votre offre est visible"
                  : "Votre offre est suspendue"
                : activeBooking
                  ? liveEnabled && activeBooking.status
                    ? requestStatusLabels[activeBooking.status]
                    : "Demande locale en attente"
                  : "Contribution conseillée"}
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
                  ? "Suspendre mon offre"
                  : "Réactiver mon offre"
                : activeBooking
                  ? "Annuler ma demande"
                  : available
                    ? liveEnabled
                      ? "Demander une place"
                      : "Simuler une demande"
                    : "Offre indisponible"
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
          accessibilityLabel={`Illustration ${meta.label}`}
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
            label="Retour"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/partage")
            }
          />
          <View style={styles.heroBadge}>
            <ShieldCheck size={12} color="#facb4c" />
            <Txt size={10} weight="bold" style={{ color: "#fff" }}>
              {own
                ? liveEnabled
                  ? "VOTRE OFFRE"
                  : "VOTRE OFFRE LOCALE"
                : "ENTRE VOISINS"}
            </Txt>
          </View>
        </View>
        <View style={styles.heroTitle}>
          <View style={styles.heroSource}>
            <meta.icon size={16} color="#facb4c" />
            <Txt size={11} weight="bold" style={{ color: "#facb4c" }}>
              {meta.label.toLocaleUpperCase("fr")}
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
                ? `à ${origin.name}`
                : `${distance.toFixed(1)} km depuis ${origin.name}`}
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
              ? "Disponible"
              : "Disponible dans ce scénario"
            : own
              ? "Offre suspendue"
              : "Actuellement indisponible"}
        </Txt>
      </View>
      {booking && liveEnabled && booking.status && (
        <Card>
          <View style={styles.statusRow}>
            <CheckCircle2 size={20} color={colors.green} />
            <Txt weight="bold" style={{ color: colors.green, flex: 1 }}>
              Votre demande :{" "}
              {requestStatusLabels[booking.status].toLowerCase()}
            </Txt>
          </View>
          <Txt size={12} tone="muted">
            {booking.status === "accepted" || booking.status === "finished"
              ? booking.address
                ? `Adresse donnée par l’hôte : ${booking.address}`
                : "L’hôte n’a pas indiqué d’adresse précise : contactez-le dans le quartier."
              : booking.status === "pending"
                ? "L’hôte a été prévenu. L’adresse exacte s’affichera s’il accepte."
                : "Cette demande est close."}
          </Txt>
          {booking.status === "accepted" && (
            <Button
              label="Terminer : j’ai eu mon énergie"
              variant="secondary"
              onPress={() => answerRequest(booking.id, "finished")}
            />
          )}
        </Card>
      )}
      {own && liveEnabled && (
        <Card>
          <Txt weight="bold">Demandes reçues ({requestsHere.length})</Txt>
          {requestsHere.length === 0 && (
            <Txt size={12} tone="muted">
              Aucune demande pour le moment. Vous serez prévenu dès qu’un voisin
              en fait une.
            </Txt>
          )}
          {requestsHere.map((item) => (
            <View key={item.id} style={styles.requestRow}>
              <Txt size={12} style={{ flex: 1 }}>
                {new Date(item.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Africa/Accra",
                })}{" "}
                · {requestStatusLabels[item.status]}
                {item.message ? ` · « ${item.message} »` : ""}
              </Txt>
              {item.status === "pending" && (
                <>
                  <Button
                    label="Accepter"
                    onPress={() => answerRequest(item.id, "accepted")}
                  />
                  <Button
                    label="Refuser"
                    variant="secondary"
                    onPress={() => answerRequest(item.id, "refused")}
                  />
                </>
              )}
              {item.status === "accepted" && (
                <Button
                  label="Terminer"
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
              <Txt weight="bold">Quel est le problème ?</Txt>
              {[
                "Prix abusif",
                "Offre trompeuse ou fausse",
                "Comportement inapproprié",
              ].map((reason) => (
                <Button
                  key={reason}
                  label={reason}
                  variant="secondary"
                  onPress={() => {
                    reportAbuse(offer.id, reason);
                    setAbuseOpen(false);
                    setMessage(
                      "Merci, l’équipe LightLink va examiner cette offre.",
                    );
                  }}
                />
              ))}
              <Button
                label="Annuler"
                variant="ghost"
                onPress={() => setAbuseOpen(false)}
              />
            </>
          ) : (
            <Button
              label="Signaler cette offre"
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
              Demande simulée enregistrée
            </Txt>
          </View>
          <Txt size={12} tone="muted">
            En attente sur cet appareil. Aucun message n’a été envoyé à l’hôte
            et aucune place n’a été réservée.
          </Txt>
          <Button
            label="Voir mes demandes"
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
                ? "Votre contribution au quartier"
                : liveEnabled
                  ? "Votre voisin"
                  : "Votre voisin dans ce scénario"}
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
              dans le scénario
            </Txt>
          </View>
          <View style={[styles.fact, { backgroundColor: colors.soft }]}>
            <Clock3 size={19} color={colors.accent} />
            <Txt size={16} weight="bold">
              Jusqu’à {offer.until}
            </Txt>
            <Txt size={10} tone="muted">
              horaire du scénario
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
            Vous gardez la main.
          </Txt>
          <Txt size={13} tone="muted">
            Vous avez publié cette offre.
          </Txt>
          <Txt size={13} tone="muted">
            Suspendez votre offre pour la masquer des offres disponibles de cet
            appareil. Vous pourrez la réactiver depuis cette page ou Mes offres.
          </Txt>
          <Button
            label="Voir mes offres"
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
          Position au centre du quartier. Aucune adresse privée n’est affichée.
        </Txt>
      </View>
      <DemoNote text="Offre locale de démonstration. Aucun hôte n’est contacté, aucun paiement n’est collecté et aucune acceptation distante n’est simulée." />
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
