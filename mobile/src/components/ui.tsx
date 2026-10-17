import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextProps,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  MapPin,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useDemo } from "@/providers/demo-provider";
import { fonts, statusMeta, sourceMeta } from "@/lib/theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  neighborhoods,
  type EnergyOffer,
  type EnergyStatus,
} from "@/lib/energy";

export function feedback() {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
}
export const TabSceneContext = createContext(false);
export function Txt({
  size = 14,
  weight = "regular",
  tone = "default",
  style,
  ...props
}: TextProps & {
  size?: number;
  weight?: keyof typeof fonts;
  tone?: "default" | "muted" | "accent" | "danger";
}) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: fonts[weight],
          fontSize: size,
          lineHeight: size * 1.5,
          color:
            tone === "muted"
              ? colors.muted
              : tone === "accent"
                ? colors.accent
                : tone === "danger"
                  ? colors.red
                  : colors.ink,
        },
        style,
      ]}
    />
  );
}
export function Screen({
  children,
  title,
  subtitle,
  action,
  scroll = true,
  scrollRef,
  footer,
  contentGap = 22,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
  scrollRef?: Ref<ScrollView>;
  footer?: ReactNode;
  contentGap?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inTabs = useContext(TabSceneContext);
  const body = (
    <View
      style={{
        padding: 20,
        gap: contentGap,
        paddingBottom: footer ? 24 : (inTabs ? 116 : 32) + insets.bottom,
      }}
    >
      <ConnectivityNotice />
      {title && (
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt
              size={30}
              weight="extrabold"
              accessibilityRole="header"
              style={{ lineHeight: 37, letterSpacing: -0.9 }}
            >
              {title}
            </Txt>
            {subtitle && (
              <Txt size={13} tone="muted">
                {subtitle}
              </Txt>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: insets.top,
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          maxWidth: 640,
          alignSelf: "center",
        }}
      >
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, minHeight: 0 }}
            keyboardShouldPersistTaps="handled"
            // React Native Web also dismisses focus during programmatic scrolls.
            keyboardDismissMode={Platform.OS === "web" ? "none" : "on-drag"}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer && (
          <View
            style={{
              backgroundColor: colors.canvas,
              paddingBottom: inTabs ? 94 + insets.bottom : insets.bottom,
            }}
          >
            {footer}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
export function BackHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.row}>
      <IconButton
        icon={ArrowLeft}
        label="Retour"
        onPress={
          onBack ??
          (() => (router.canGoBack() ? router.back() : router.replace("/")))
        }
      />
      <Txt size={18} weight="bold" style={{ flex: 1 }}>
        {title}
      </Txt>
      <View style={{ width: 44 }} />
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.line,
          gap: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const ink =
    variant === "primary"
      ? colors.navy
      : variant === "danger"
        ? colors.red
        : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        feedback();
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: 14,
          paddingHorizontal: 17,
          paddingVertical: 12,
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            variant === "primary"
              ? colors.yellow
              : variant === "secondary"
                ? colors.raised
                : variant === "danger"
                  ? colors.red + "12"
                  : "transparent",
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.line,
          opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        Icon && <Icon size={19} color={ink} />
      )}
      <Txt
        weight="bold"
        style={{ color: ink, flexShrink: 1, textAlign: "center" }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        feedback();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.soft,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon color={colors.ink} size={21} />
    </Pressable>
  );
}
export const Field = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    error?: string;
    hint?: string;
    hideLabel?: boolean;
  }
>(function Field(
  { label, style, error, hint, hideLabel = false, onFocus, onBlur, ...props },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const fieldId = useId();
  return (
    <View style={{ gap: 8 }}>
      {!hideLabel && (
        <Txt size={13} weight="bold">
          {label}
        </Txt>
      )}
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint ?? props.accessibilityHint}
        aria-invalid={!!error}
        aria-describedby={error || hint ? fieldId : undefined}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={colors.muted}
        selectionColor={colors.yellow}
        style={[
          {
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.ink,
            backgroundColor: colors.soft,
            borderWidth: 1,
            borderColor: error
              ? colors.red
              : focused
                ? colors.accent
                : colors.line,
            borderRadius: 14,
            minHeight: 50,
            padding: 14,
            textAlignVertical: props.multiline ? "top" : "center",
          },
          props.multiline && { minHeight: 110 },
          style,
        ]}
      />
      {(error || hint) && (
        <Txt
          nativeID={fieldId}
          size={12}
          tone={error ? "danger" : "muted"}
          accessibilityRole={error ? "alert" : undefined}
        >
          {error ?? hint}
        </Txt>
      )}
    </View>
  );
});
export function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: value === option.value }}
          aria-pressed={value === option.value}
          onPress={() => {
            feedback();
            onChange(option.value);
          }}
          style={{
            minHeight: 44,
            paddingHorizontal: 15,
            paddingVertical: 11,
            borderRadius: 13,
            backgroundColor:
              value === option.value ? colors.yellow : colors.soft,
            borderWidth: 1,
            borderColor: value === option.value ? colors.yellow : colors.line,
            flexDirection: "row",
            gap: 7,
            alignItems: "center",
          }}
        >
          {option.icon && (
            <option.icon
              size={16}
              color={value === option.value ? colors.navy : colors.muted}
            />
          )}
          <Txt
            size={12}
            weight="bold"
            style={{
              color: value === option.value ? colors.navy : colors.muted,
            }}
          >
            {option.label}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function ZonePicker({
  value,
  onChange,
  label = "Choisir le quartier",
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
          feedback();
        }}
        style={{
          minHeight: compact ? 44 : 48,
          backgroundColor: compact ? "transparent" : colors.soft,
          borderWidth: compact ? 0 : 1,
          borderColor: colors.line,
          borderRadius: 14,
          padding: compact ? 0 : 13,
          flexDirection: "row",
          gap: 9,
          alignItems: "center",
        }}
      >
        <MapPin size={17} color={colors.accent} />
        <Txt weight="bold" style={{ flex: 1 }}>
          {neighborhoods.find((zone) => zone.id === value)?.name ??
            "Choisir un quartier"}
        </Txt>
        <ChevronDown size={17} color={colors.muted} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType={reducedMotion ? "none" : "fade"}
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000088",
          }}
        >
          <Pressable
            accessibilityLabel="Fermer le choix du quartier"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.canvas,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: "85%",
              width: "100%",
              maxWidth: 640,
              alignSelf: "center",
              gap: 16,
            }}
          >
            <View style={styles.row}>
              <Txt weight="extrabold" size={21} style={{ flex: 1 }}>
                Votre quartier
              </Txt>
              <IconButton
                icon={X}
                label="Fermer"
                onPress={() => setOpen(false)}
              />
            </View>
            <Txt tone="muted" size={13}>
              Les 10 quartiers du scénario à Accra.
            </Txt>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {neighborhoods.map((zone) => (
                <Pressable
                  key={zone.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: zone.id === value }}
                  accessibilityLabel={zone.name}
                  onPress={() => {
                    onChange(zone.id);
                    setOpen(false);
                    feedback();
                  }}
                  style={{
                    minHeight: 50,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Txt
                    weight={zone.id === value ? "bold" : "regular"}
                    style={{ flex: 1 }}
                  >
                    {zone.name}
                  </Txt>
                  {zone.id === value && (
                    <Check size={20} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
export function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Txt
        weight="bold"
        size={20}
        accessibilityRole="header"
        style={{ flex: 1 }}
      >
        {title}
      </Txt>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{
            minHeight: 44,
            alignItems: "center",
            flexDirection: "row",
            gap: 2,
          }}
        >
          <Txt tone="accent" size={12} weight="bold">
            {action}
          </Txt>
          <ChevronRight size={15} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}
export function StatusPill({ status }: { status: EnergyStatus }) {
  const { colors } = useTheme();
  const meta = statusMeta[status];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors[meta.color] + "16",
      }}
    >
      <View
        style={{
          height: 6,
          width: 6,
          borderRadius: 3,
          backgroundColor: colors[meta.color],
        }}
      />
      <Txt size={11} weight="bold" style={{ color: colors[meta.color] }}>
        {meta.label}
      </Txt>
    </View>
  );
}
export function DemoNote({
  text = "Scénario du 4 oct. 2026 · données de démonstration",
}: {
  text?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 7, alignItems: "flex-start" }}>
      <Info size={14} color={colors.muted} style={{ marginTop: 2 }} />
      <Txt tone="muted" size={11} style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}
export function StorageNotice() {
  const { storageError, sync } = useDemo();
  if (!storageError && !sync.pending && !sync.notice) return null;
  return (
    <Card>
      {storageError && (
        <Txt tone="danger" size={12}>
          {storageError}
        </Txt>
      )}
      {sync.pending > 0 && (
        <Txt size={12} accessibilityLiveRegion="polite">
          {sync.pending === 1
            ? "1 signalement attend le réseau. Il partira automatiquement."
            : `${sync.pending} signalements attendent le réseau. Ils partiront automatiquement.`}
        </Txt>
      )}
      {sync.notice && (
        <Txt tone="danger" size={12} accessibilityRole="alert">
          {sync.notice}
        </Txt>
      )}
    </Card>
  );
}
function ConnectivityNotice() {
  const { isConnected } = useNetInfo();
  return isConnected === false ? (
    <Txt size={11} tone="muted" accessibilityRole="alert">
      Hors ligne · vos contributions restent sur cet appareil.
    </Txt>
  ) : null;
}
export function OfferCard({
  offer,
  onPress,
  compact = false,
}: {
  offer: EnergyOffer & { distance?: number };
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const meta = sourceMeta[offer.source];
  const zone = neighborhoods.find(
    (item) => item.id === offer.neighborhoodId,
  )?.name;
  const source =
    offer.source === "solar"
      ? require("../../assets/solar.webp")
      : offer.source === "generator"
        ? require("../../assets/generator.webp")
        : require("../../assets/battery.webp");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={offer.title}
      accessibilityHint={
        meta.label +
        ", " +
        offer.slots +
        " places. Ouvrir les détails de l’offre."
      }
      onPress={() => {
        feedback();
        onPress();
      }}
      style={({ pressed }) => ({
        width: compact ? 268 : undefined,
        borderRadius: 25,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View style={{ height: compact ? 236 : 225, overflow: "hidden" }}>
        <Image
          source={source}
          contentFit="cover"
          transition={0}
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Illustration de la source d’énergie"
        />
        <LinearGradient
          colors={["#09192300", "#09192325", "#091923f5"]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 14,
            gap: 8,
          }}
        >
          <View
            style={{
              backgroundColor: "#f8f7efeF",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              flexDirection: "row",
              gap: 5,
              alignItems: "center",
            }}
          >
            <meta.icon size={13} color="#132d39" />
            <Txt size={10} weight="extrabold" style={{ color: "#132d39" }}>
              {meta.label}
            </Txt>
          </View>
          <View
            style={{
              backgroundColor: "#132d39cc",
              paddingHorizontal: 9,
              paddingVertical: 6,
              borderRadius: 12,
            }}
          >
            <Txt size={10} weight="bold" style={{ color: "#fff" }}>
              {offer.distance === undefined
                ? zone
                : offer.distance < 0.1
                  ? "Tout près"
                  : offer.distance.toFixed(1) + " km"}
            </Txt>
          </View>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 17,
            left: 17,
            right: 17,
            gap: 7,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <MapPin size={12} color="#facb4c" />
            <Txt size={11} weight="medium" style={{ color: "#e3ebee" }}>
              {zone} · jusqu’à {offer.until}
            </Txt>
          </View>
          <Txt
            size={compact ? 19 : 22}
            weight="extrabold"
            numberOfLines={2}
            style={{
              color: "#fff",
              lineHeight: compact ? 26 : 29,
              letterSpacing: -0.5,
            }}
          >
            {offer.title}
          </Txt>
        </View>
      </View>
      <View
        style={{
          padding: 15,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={19} weight="extrabold">
            {offer.price === 0 ? (
              "Gratuit"
            ) : (
              <>
                {offer.price}
                <Txt size={11} tone="muted">
                  {" "}
                  GHS conseillés
                </Txt>
              </>
            )}
          </Txt>
          <Txt size={11} tone="muted" numberOfLines={1}>
            {offer.host} · {offer.slots}{" "}
            {offer.slots === 1 ? "place" : "places"}
          </Txt>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.yellow,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight size={21} color={colors.navy} />
        </View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
