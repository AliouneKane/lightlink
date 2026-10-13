import { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  BatteryCharging,
  Plus,
  Search,
  Sun,
  PlugZap,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react-native";
import {
  Button,
  Card,
  Chips,
  DemoNote,
  Field,
  IconButton,
  OfferCard,
  Screen,
  Txt,
  ZonePicker,
} from "@/components/ui";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { getOffers, neighborhoods, type OfferFilter } from "@/lib/energy";
export default function Sharing() {
  const { state } = useDemo();
  const params = useLocalSearchParams<{ zone?: string }>();
  const initialOrigin =
    neighborhoods.find((zone) => zone.id === params.zone)?.id ??
    state.profile.neighborhoodId;
  return <SharingResults key={initialOrigin} initialOrigin={initialOrigin} />;
}
function SharingResults({ initialOrigin }: { initialOrigin: string }) {
  const { state } = useDemo();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [sortOpen, setSortOpen] = useState(false);
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("distance");
  const [limit, setLimit] = useState(12);
  const [origin, setOrigin] = useState(initialOrigin);
  const sortOptions = [
    {
      value: "distance",
      label: "À proximité",
      hint: "Les offres les plus proches d’abord.",
    },
    {
      value: "price",
      label: "Petit budget",
      hint: "La contribution la plus basse d’abord.",
    },
    {
      value: "slots",
      label: "Plus de places",
      hint: "Les sources avec le plus de places.",
    },
  ];
  const offers = getOffers(state.offers, origin, filter, query).sort((a, b) =>
    sort === "price"
      ? a.price - b.price || a.distance - b.distance
      : sort === "slots"
        ? b.slots - a.slots || a.distance - b.distance
        : a.distance - b.distance,
  );
  return (
    <Screen
      contentGap={16}
      title="Les bonnes énergies."
      subtitle="Un voisin. Une source. Un nouveau lien."
      action={
        <IconButton
          icon={Plus}
          label="Publier une offre"
          onPress={() => router.push("/publier")}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <ZonePicker
            compact
            value={origin}
            onChange={(value) => {
              setOrigin(value);
              setLimit(12);
            }}
            label="Chercher autour d’un quartier"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trier les offres"
          accessibilityHint={
            sortOptions.find((option) => option.value === sort)?.label
          }
          onPress={() => {
            Keyboard.dismiss();
            setSortOpen(true);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            minHeight: 44,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <SlidersHorizontal size={15} color={colors.accent} />
          <Txt size={11} weight="bold">
            {sortOptions.find((option) => option.value === sort)?.label}
          </Txt>
        </Pressable>
      </View>
      <Field
        label="Rechercher une énergie"
        hideLabel
        placeholder="Quartier, offre ou voisin…"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setLimit(12);
        }}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <Chips
        value={filter}
        onChange={(value) => {
          setFilter(value as OfferFilter);
          setLimit(12);
        }}
        options={[
          { value: "all", label: "Tout" },
          { value: "solar", label: "Solaire", icon: Sun },
          { value: "generator", label: "Générateur", icon: PlugZap },
          { value: "battery", label: "Batterie", icon: BatteryCharging },
        ]}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Txt weight="bold" size={14}>
          {offers.length}{" "}
          {offers.length === 1 ? "offre disponible" : "offres disponibles"}
        </Txt>
        <Txt size={10} tone="muted" weight="bold" style={{ letterSpacing: 1 }}>
          DÉMO LOCALE
        </Txt>
      </View>
      {offers.slice(0, limit).map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          onPress={() =>
            router.push({
              pathname: "/offre/[id]",
              params: { id: offer.id, zone: origin },
            })
          }
        />
      ))}
      {offers.length > limit && (
        <Button
          label="Voir plus d’offres"
          variant="secondary"
          onPress={() => setLimit((value) => value + 12)}
        />
      )}
      {offers.length === 0 && (
        <Card>
          <Search size={30} color="#b2bec8" />
          <Txt size={19} weight="bold">
            Aucune offre par ici.
          </Txt>
          <Txt tone="muted">
            Essayez un autre quartier ou une autre source d’énergie.
          </Txt>
          <Button
            label="Effacer les filtres"
            variant="secondary"
            onPress={() => {
              setQuery("");
              setFilter("all");
            }}
          />
        </Card>
      )}
      <Button
        label="J’ai de l’énergie à partager"
        icon={Plus}
        variant="secondary"
        onPress={() => router.push("/publier")}
      />
      <DemoNote text="Offres de démonstration, sans paiement. Distances entre centres de quartiers, à vol d’oiseau." />
      <Modal
        transparent
        visible={sortOpen}
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={() => setSortOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000080",
          }}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Fermer le tri"
            onPress={() => setSortOpen(false)}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 640,
              maxHeight: "85%",
              alignSelf: "center",
              padding: 22,
              paddingBottom: Math.max(insets.bottom, 20),
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              backgroundColor: colors.canvas,
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Txt
                size={23}
                weight="extrabold"
                accessibilityRole="header"
                style={{ flex: 1 }}
              >
                À votre façon.
              </Txt>
              <IconButton
                icon={X}
                label="Fermer"
                onPress={() => setSortOpen(false)}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
            >
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: sort === option.value }}
                  onPress={() => {
                    setSort(option.value);
                    setLimit(12);
                    setSortOpen(false);
                  }}
                  style={{
                    minHeight: 64,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt size={14} weight="bold">
                      {option.label}
                    </Txt>
                    <Txt size={12} tone="muted">
                      {option.hint}
                    </Txt>
                  </View>
                  {sort === option.value && (
                    <Check size={20} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
