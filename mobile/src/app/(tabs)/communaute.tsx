import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowUpRight,
  MapPin,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react-native";
import {
  Button,
  Card,
  Chips,
  DemoNote,
  Screen,
  SectionTitle,
  StatusPill,
  StorageNotice,
  Txt,
  feedback,
} from "@/components/ui";
import { formatTime } from "@/lib/energy";
import { useDemo } from "@/providers/demo-provider";
import { useTheme } from "@/providers/theme-provider";

const avatarPalette = [
  { background: "#F5D475", ink: "#493B16" },
  { background: "#CCE1D8", ink: "#2D5143" },
  { background: "#DCD9EE", ink: "#51456F" },
  { background: "#CEE1ED", ink: "#35566C" },
  { background: "#F0D4C6", ink: "#754C39" },
];
function avatarFor(name: string) {
  const hash = Array.from(name).reduce(
    (sum, letter) =>
      (sum * 33 + (letter.codePointAt(0) ?? 0)) % avatarPalette.length,
    0,
  );
  return avatarPalette[hash % avatarPalette.length];
}
function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("en");
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(new Date(value));
}

export default function CommunityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, neighborhoods } = useDemo();
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(12);
  const current = neighborhoods.find(
    (zone) => zone.id === state.profile.neighborhoodId,
  );
  const reports = useMemo(
    () =>
      state.reports
        .filter(
          (report) =>
            filter === "all" ||
            report.neighborhoodId === state.profile.neighborhoodId,
        )
        .sort(
          (first, second) =>
            Date.parse(second.createdAt) - Date.parse(first.createdAt),
        ),
    [filter, state.profile.neighborhoodId, state.reports],
  );
  const visibleReports = reports.slice(0, visibleCount);
  const nearbyAuthors = Array.from(
    new Set(state.reports.map((report) => report.author)),
  ).slice(0, 3);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 7 }}>
          <View style={[styles.row, { gap: 6 }]}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
            <Txt
              size={10}
              weight="extrabold"
              tone="muted"
              style={{ letterSpacing: 1.7 }}
            >
              ENERGY CONNECTS US
            </Txt>
          </View>
          <Txt
            size={32}
            weight="extrabold"
            accessibilityRole="header"
            style={{ lineHeight: 40, letterSpacing: -1.1 }}
          >
            Community
          </Txt>
        </View>
        {nearbyAuthors.length > 0 && (
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.faces}
          >
            {nearbyAuthors.map((author, index) => {
              const avatar = avatarFor(author);
              return (
                <View
                  key={author}
                  style={[
                    styles.headerAvatar,
                    {
                      backgroundColor: avatar.background,
                      borderColor: colors.canvas,
                      marginLeft: index === 0 ? 0 : -15,
                    },
                  ]}
                >
                  <Txt
                    size={10}
                    weight="extrabold"
                    style={{ color: avatar.ink }}
                  >
                    {initialsFor(author)}
                  </Txt>
                </View>
              );
            })}
          </View>
        )}
      </View>
      <Txt size={13} tone="muted" style={{ marginTop: -12 }}>
        The neighbourhood’s energy is you too.
      </Txt>
      <StorageNotice />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report the power status"
        onPress={() => {
          feedback();
          router.push("/signaler");
        }}
        style={({ pressed }) => [
          styles.invitation,
          { backgroundColor: colors.yellow, opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <View style={styles.invitationAvatar}>
          <Txt size={14} weight="extrabold" style={{ color: "#132d39" }}>
            {initialsFor(state.profile.name)}
          </Txt>
          <View style={styles.invitationPlus}>
            <Plus size={10} color="#facb4c" strokeWidth={3} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt
            size={14}
            weight="extrabold"
            style={{ color: "#132d39", letterSpacing: -0.3 }}
          >
            And at your place, is the power on?
          </Txt>
          <Txt size={11} weight="medium" style={{ color: "#35452D" }}>
            Report the power status
          </Txt>
        </View>
        <View style={styles.invitationArrow}>
          <ArrowUpRight size={20} color="#132d39" />
        </View>
      </Pressable>

      <View style={{ gap: 15 }}>
        <View style={styles.sectionIntro}>
          <SectionTitle
            title={
              filter === "all"
                ? "Voices of the neighbourhoods"
                : "Voices of the neighbourhood"
            }
          />
          <Txt size={11} tone="muted">
            Scenario contributions and reports saved on this device.
          </Txt>
        </View>
        <Chips
          options={[
            { value: "all", label: "All neighbourhoods", icon: Users },
            { value: "current", label: "My neighbourhood", icon: MapPin },
          ]}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setVisibleCount(12);
          }}
        />
        <View style={styles.countRow}>
          <Txt size={11} tone="muted">
            {reports.length} contribution{reports.length === 1 ? "" : "s"}
          </Txt>
          <View style={[styles.row, { gap: 5 }]}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
            <Txt size={10} tone="muted">
              Local demo
            </Txt>
          </View>
        </View>
      </View>

      {reports.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.soft }]}>
            <MessageCircle size={30} color={colors.muted} strokeWidth={1.5} />
          </View>
          <Txt size={18} weight="bold">
            Start the conversation
          </Txt>
          <Txt size={14} tone="muted" style={styles.centerText}>
            No local contribution for {current?.name ?? "this neighbourhood"}.
            Add your first report.
          </Txt>
          <Button
            label="Add a report"
            icon={ArrowUpRight}
            onPress={() => router.push("/signaler")}
          />
        </Card>
      ) : (
        <View>
          {visibleReports.map((report, index) => {
            const localContribution = report.id.startsWith("mobile-report-");
            const zone = neighborhoods.find(
              (item) => item.id === report.neighborhoodId,
            );
            const avatar = localContribution
              ? avatarPalette[0]
              : avatarFor(report.author);
            const date = formatDate(report.createdAt);
            const previousDate =
              index > 0
                ? formatDate(visibleReports[index - 1].createdAt)
                : null;
            const nextDate =
              index + 1 < visibleReports.length
                ? formatDate(visibleReports[index + 1].createdAt)
                : null;
            return (
              <View key={report.id}>
                {date !== previousDate && (
                  <View
                    style={[
                      styles.dateSeparator,
                      { marginTop: index === 0 ? 0 : 8 },
                    ]}
                  >
                    <View
                      style={[
                        styles.dateLine,
                        { backgroundColor: colors.line },
                      ]}
                    />
                    <Txt
                      size={10}
                      weight="bold"
                      tone="muted"
                      style={{ textTransform: "capitalize" }}
                    >
                      {date}
                    </Txt>
                    <View
                      style={[
                        styles.dateLine,
                        { backgroundColor: colors.line },
                      ]}
                    />
                  </View>
                )}
                <View style={styles.reportRow}>
                  <View style={styles.avatarRail}>
                    {nextDate === date && (
                      <View
                        style={[
                          styles.timeline,
                          { backgroundColor: colors.line },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: avatar.background,
                          borderColor: colors.canvas,
                        },
                      ]}
                    >
                      <Txt
                        size={13}
                        weight="extrabold"
                        style={{ color: avatar.ink }}
                      >
                        {initialsFor(report.author)}
                      </Txt>
                    </View>
                  </View>
                  <View style={styles.reportContent}>
                    <View style={{ gap: 3 }}>
                      <View style={[styles.row, { gap: 7, flexWrap: "wrap" }]}>
                        <Txt size={14} weight="bold" style={{ flexShrink: 1 }}>
                          {report.author}
                        </Txt>
                        {localContribution && (
                          <View
                            style={{
                              backgroundColor: colors.yellow + "20",
                              borderRadius: 6,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}
                          >
                            <Txt size={9} weight="extrabold" tone="accent">
                              YOU
                            </Txt>
                          </View>
                        )}
                      </View>
                      <Txt size={11} tone="muted">
                        {zone?.name} · {formatTime(report.createdAt)} GMT
                      </Txt>
                    </View>
                    <View style={{ gap: 10, paddingTop: 10 }}>
                      <StatusPill status={report.status} />
                      <Txt size={13} style={{ lineHeight: 21 }}>
                        {report.description ||
                          "Power status reported in this neighbourhood."}
                      </Txt>
                    </View>
                    {nextDate === date && (
                      <View
                        style={{
                          height: StyleSheet.hairlineWidth,
                          backgroundColor: colors.line,
                          marginTop: 19,
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
      {reports.length > visibleReports.length && (
        <View style={{ gap: 8 }}>
          <Txt size={12} tone="muted" style={styles.centerText}>
            {visibleReports.length} of {reports.length} contributions shown
          </Txt>
          <Button
            label={
              "Show " +
              Math.min(12, reports.length - visibleReports.length) +
              " more contributions"
            }
            variant="secondary"
            onPress={() => setVisibleCount((count) => count + 12)}
          />
        </View>
      )}
      <DemoNote text="Contributions stay on this device. No report is sent to the power grid or to other residents." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  faces: { flexDirection: "row", paddingLeft: 3, paddingTop: 11 },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  invitation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 22,
    minHeight: 82,
  },
  invitationAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#132d3910",
    alignItems: "center",
    justifyContent: "center",
  },
  invitationPlus: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#132d39",
    borderWidth: 2,
    borderColor: "#facb4c",
    alignItems: "center",
    justifyContent: "center",
  },
  invitationArrow: {
    width: 35,
    height: 35,
    borderRadius: 13,
    backgroundColor: "#132d3910",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIntro: { gap: 3 },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 20,
  },
  dateLine: { height: StyleSheet.hairlineWidth, flex: 1 },
  reportRow: { flexDirection: "row", gap: 12, paddingBottom: 22 },
  avatarRail: { width: 42, alignItems: "center" },
  timeline: { position: "absolute", width: 1, top: 43, bottom: -1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  reportContent: { flex: 1, minWidth: 0, paddingTop: 2 },
  emptyCard: { alignItems: "center", gap: 15, paddingVertical: 28 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: { textAlign: "center", lineHeight: 22 },
});
