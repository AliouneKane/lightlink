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
  const { state, places, neighborhoods } = useDemo();
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
      label: "Nearby",
      hint: "Nearest offers first.",
    },
    {
      value: "price",
      label: "Low budget",
      hint: "Lowest contribution first.",
    },
    {
      value: "slots",
      label: "Most places",
      hint: "Sources with the most places.",
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
      title="Good energy nearby."
      subtitle="A neighbour. A source. A new link."
      action={
        <IconButton
          icon={Plus}
          label="Publish an offer"
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
            label="Search around a neighbourhood"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sort offers"
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
        label="Search for energy"
        hideLabel
        placeholder="Neighbourhood, offer or neighbour…"
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
          { value: "all", label: "All" },
          { value: "solar", label: "Solar", icon: Sun },
          { value: "generator", label: "Generator", icon: PlugZap },
          { value: "battery", label: "Battery", icon: BatteryCharging },
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
          {offers.length === 1 ? "offer available" : "offers available"}
        </Txt>
        <Txt size={10} tone="muted" weight="bold" style={{ letterSpacing: 1 }}>
          LOCAL DEMO
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
          label="See more offers"
          variant="secondary"
          onPress={() => setLimit((value) => value + 12)}
        />
      )}
      {offers.length === 0 && (
        <Card>
          <Search size={30} color="#b2bec8" />
          <Txt size={19} weight="bold">
            No offers around here.
          </Txt>
          <Txt tone="muted">
            Try another neighbourhood or another energy source.
          </Txt>
          <Button
            label="Clear filters"
            variant="secondary"
            onPress={() => {
              setQuery("");
              setFilter("all");
            }}
          />
        </Card>
      )}
      <Button
        label="I have energy to share"
        icon={Plus}
        variant="secondary"
        onPress={() => router.push("/publier")}
      />
      {places.length > 0 && (
        // Task 91: the whole neighbourhood is cut, the database proposes fixed places.
        <Card>
          <Txt size={15} weight="bold">
            Energy places a little further away
          </Txt>
          {places.map((place) => (
            <Txt key={place.id} size={12} tone="muted">
              {place.name} ·{" "}
              {neighborhoods.find((zone) => zone.id === place.zoneId)?.name ??
                place.zoneId}{" "}
              · {place.distanceKm.toFixed(1)} km
            </Txt>
          ))}
        </Card>
      )}
      <DemoNote
        text="Demo offers, no payment. Straight-line distances between neighbourhood centres."
        live="Neighbours’ offers, no payment through LightLink. Straight-line distances between neighbourhood centres."
      />
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
            accessibilityLabel="Close sorting"
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
                Your way.
              </Txt>
              <IconButton
                icon={X}
                label="Close"
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
