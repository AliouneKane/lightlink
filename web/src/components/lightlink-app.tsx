"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "./app-shell";
import { Dashboard } from "./dashboard";
import { defaultDisplay, updateDisplay } from "@/lib/display-store";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  Check,
  CheckCheck,
  Clock3,
  Compass,
  Eye,
  EyeOff,
  HeartHandshake,
  Map,
  MapPin,
  Plus,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
  X,
  Zap,
  ZapOff,
} from "lucide-react";
import {
  Brand,
  Status,
  Modal,
  EnergyArtwork,
  RiskChart,
  statusLabels,
} from "./ui";
import {
  DEMO_TIMESTAMP,
  answerReport,
  applyLiveStatus,
  findAnswer,
  formatDay,
  formatTime,
  getNeighborhoods,
  getOffers,
  getZoneAnnouncements,
  initialState,
  isActive,
  neighborhoods,
  scheduleRowsToAnnouncements,
  withoutLiveData,
  createLiveOffer,
  reportLiveAbuse,
  requestLiveOffer,
  requestStatusLabels,
  setLiveOfferOpen,
  setLiveRequestStatus,
  validateOffer,
  validateReport,
  type EnergyOffer,
} from "@/lib/energy";
import {
  liveEnabled,
  sendReport,
  signIn,
  signUp,
  useLiveData,
  useLiveSharing,
} from "@/lib/live";
import { updateDemoState, useDemoState } from "@/lib/demo-store";
import { forecastSourceLabel, getForecast } from "../../../shared/forecast";

const EnergyMap = dynamic(() => import("./energy-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="loading-orbit" />
      <span>Loading the map of Accra…</span>
    </div>
  ),
});

const sourceLabels = {
  solar: "Solar",
  generator: "Generator",
  battery: "Battery",
};
const sourceIcons = { solar: Sun, generator: Zap, battery: BatteryCharging };
const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);
const now = () =>
  new Date(Math.max(Date.now(), Date.parse(DEMO_TIMESTAMP)) + 1).toISOString();

export function LightLinkApp({
  initialNeighborhood,
  initialSource,
}: {
  initialNeighborhood?: string;
  initialSource?: EnergyOffer["source"];
} = {}) {
  const pathname = usePathname();
  const view = pathname === "/" ? "dashboard" : pathname.slice(1);
  const state = useDemoState();
  const live = useLiveData();
  // Phase 3, live mode: offers and requests come from Supabase, not from this browser.
  const sharing = useLiveSharing(state.profile.neighborhoodId);
  const shownOffers = liveEnabled ? sharing.data.offers : state.offers;
  const shownBookings = liveEnabled ? sharing.data.bookings : state.bookings;
  /** A request that still holds or may hold a place (demo requests have no status). */
  const isActiveBooking = (booking: (typeof shownBookings)[number]) =>
    !booking.status ||
    booking.status === "pending" ||
    booking.status === "accepted";
  // Live mode never shows the demo states: before the first read, or if it fails,
  // the zones carry no state and the map says why (PAN's review of #6).
  const zones = live.zones
    ? applyLiveStatus(getNeighborhoods(state.reports), live.zones)
    : live.state === "loading" || live.state === "error"
      ? withoutLiveData(neighborhoods, live.state)
      : getNeighborhoods(state.reports);
  const [selectedOverride, setSelectedId] = useState<string | null>(
    initialNeighborhood ?? null,
  );
  const selectedId = selectedOverride ?? state.profile.neighborhoodId;
  const [layer, setLayer] = useState<"all" | "outages" | "energy">("all");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<
    "all" | "solar" | "generator" | "battery"
  >(initialSource ?? "all");
  const [dialog, setDialog] = useState<
    "report" | "offer" | "auth" | "notifications" | "help" | "reset" | null
  >(null);
  const [offerDetail, setOfferDetail] = useState<EnergyOffer | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [online, setOnline] = useState(true);
  const [locating, setLocating] = useState(false);
  const [reportStatus, setReportStatus] = useState<"outage" | "powered">(
    "outage",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [showPassword, setShowPassword] = useState(false);

  const selected = zones.find((zone) => zone.id === selectedId) ?? zones[0];
  const latestSelectedReport = [...state.reports]
    .filter((report) => report.neighborhoodId === selected.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const homeZone =
    zones.find((zone) => zone.id === state.profile.neighborhoodId) ?? zones[0];
  const offers = getOffers(
    shownOffers,
    state.profile.neighborhoodId,
    source,
    search,
  );
  const matchingZones = zones.filter((zone) =>
    zone.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const activeOutages = zones.filter((zone) => zone.status === "outage").length;
  const forecast = getForecast(homeZone.id, live.predictions);
  const announcementTime = new Date(now());
  // Live mode reads the ECG schedules of the database and never adds a demo announcement.
  const announcements = liveEnabled
    ? getZoneAnnouncements(
        homeZone.id,
        announcementTime,
        scheduleRowsToAnnouncements(live.schedules),
        false,
      )
    : getZoneAnnouncements(homeZone.id, announcementTime);
  const currentAnnouncement = announcements.find((item) =>
    isActive(item, announcementTime),
  );
  const currentAnswer = currentAnnouncement
    ? findAnswer(state.reports, currentAnnouncement, state.profile.name)
    : undefined;
  const pastAnnouncements = announcements.filter((item) => !item.demo);

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function save(
    update: Parameters<typeof updateDemoState>[0],
    message: string,
  ) {
    const persisted = updateDemoState(update);
    setToast(
      persisted
        ? message
        : `${message} Storage unavailable: kept for this session only.`,
    );
  }
  function openDialog(next: typeof dialog) {
    setFormError(null);
    setDialog(next);
  }
  function locate() {
    if (!navigator.geolocation) {
      setToast("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFocus([position.coords.latitude, position.coords.longitude]);
        setLocating(false);
        setToast("Map centred on your location. The examples remain in Accra.");
      },
      () => {
        setLocating(false);
        setToast("Location unavailable. Select a neighbourhood from the list.");
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const report = {
      neighborhoodId: String(form.get("neighborhood")),
      status: reportStatus,
      description: String(form.get("description") ?? "").trim(),
    };
    const error = validateReport(report);
    if (error) {
      setFormError(error);
      return;
    }
    const liveError = await sendReport(report);
    if (liveError) {
      setFormError(liveError);
      return;
    }
    save(
      (previous) => ({
        ...previous,
        reports: [
          {
            ...report,
            id: crypto.randomUUID(),
            author: previous.profile.name,
            createdAt: now(),
          },
          ...previous.reports,
        ],
      }),
      liveEnabled
        ? "Report sent. Thank you, the map updates for the whole neighbourhood."
        : "Report added to your demo. Thank you for your contribution!",
    );
    void live.refresh();
    setSelectedId(report.neighborhoodId);
    setDialog(null);
  }
  async function answerAnnouncement(hasPower: boolean) {
    if (!currentAnnouncement) return;
    const report = answerReport(currentAnnouncement, hasPower);
    const liveError = await sendReport(report);
    if (liveError) {
      setToast(liveError);
      return;
    }
    void live.refresh();
    save(
      (previous) => ({
        ...previous,
        reports: [
          {
            ...report,
            id: crypto.randomUUID(),
            author: previous.profile.name,
            createdAt: now(),
          },
          ...previous.reports,
        ],
      }),
      "Thank you! Your answer helps check whether ECG announcements are kept.",
    );
  }
  function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = {
      title: String(form.get("title")).trim(),
      neighborhoodId: String(form.get("neighborhood")),
      source: String(form.get("source")) as EnergyOffer["source"],
      capacity: String(form.get("capacity")).trim(),
      price: Number(form.get("price")),
      slots: Number(form.get("slots")),
      until: String(form.get("until")),
      description: String(form.get("description") ?? "").trim(),
    };
    const error = validateOffer(draft);
    if (error) {
      setFormError(error);
      return;
    }
    if (liveEnabled) {
      const address = String(form.get("address") ?? "").trim();
      void sharing
        .run((db) =>
          createLiveOffer(db, { ...draft, address }, state.profile.name),
        )
        .then((failure) =>
          setToast(failure ?? "Your offer is published in the neighbourhood."),
        );
      setDialog(null);
      return;
    }
    const zone = neighborhoods.find(
      (item) => item.id === draft.neighborhoodId,
    )!;
    save(
      (previous) => ({
        ...previous,
        offers: [
          {
            ...draft,
            id: crypto.randomUUID(),
            host: previous.profile.name,
            initials: previous.profile.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            available: true,
            lat: zone.lat,
            lng: zone.lng,
          },
          ...previous.offers,
        ],
      }),
      "Your demo offer is available in the neighbourhood.",
    );
    setDialog(null);
  }
  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? state.profile.name).trim();
    const neighborhoodId = String(form.get("neighborhood"));
    if (
      name.length < 2 ||
      name.length > 50 ||
      !zones.some((zone) => zone.id === neighborhoodId)
    ) {
      setFormError("Enter a name of 2 to 50 characters and a neighbourhood.");
      return;
    }
    if (liveEnabled && form.has("email")) {
      const email = String(form.get("email")).trim();
      const password = String(form.get("password") ?? "");
      const accountError =
        authMode === "register"
          ? await signUp({ email, password, name, neighborhoodId })
          : await signIn(email, password);
      if (accountError) {
        setFormError(accountError);
        return;
      }
    }
    save(
      (previous) => ({ ...previous, profile: { name, neighborhoodId } }),
      liveEnabled
        ? authMode === "register"
          ? "Account created. Welcome to LightLink!"
          : "You are signed in."
        : "Demo profile saved. No real account was created.",
    );
    setSelectedId(neighborhoodId);
    setDialog(null);
  }
  function requestEnergy(offer: EnergyOffer) {
    if (
      !offer.available ||
      shownBookings.some(
        (booking) => isActiveBooking(booking) && booking.offerId === offer.id,
      )
    )
      return;
    if (liveEnabled) {
      void sharing
        .run((db) => requestLiveOffer(db, offer.id))
        .then((failure) =>
          setToast(
            failure ??
              "Request sent. The host has been notified; the address will appear if they accept.",
          ),
        );
      setOfferDetail(null);
      return;
    }
    save(
      (previous) => ({
        ...previous,
        bookings: [
          { id: crypto.randomUUID(), offerId: offer.id, createdAt: now() },
          ...previous.bookings,
        ],
      }),
      "Simulated request saved. No message is sent to the owner.",
    );
    setOfferDetail(null);
  }

  function renderOfferCard(offer: EnergyOffer & { distance?: number }) {
    const Icon = sourceIcons[offer.source];
    const booked = shownBookings.some(
      (booking) => isActiveBooking(booking) && booking.offerId === offer.id,
    );
    const zone = zones.find((item) => item.id === offer.neighborhoodId);
    return (
      <article className="offer-card" key={offer.id}>
        <div className={`offer-visual ${offer.source}`}>
          <Image
            className="offer-photo"
            src={`/images/${offer.source}.png`}
            alt={`${sourceLabels[offer.source]} illustration for this demo offer`}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 40vw, 320px"
          />
          <span className="offer-source">
            <Icon size={14} />
            {sourceLabels[offer.source]}
          </span>
          <span className="available-badge">
            <span />
            Available
          </span>
          <span
            className="offer-price"
            title="Suggested contribution, no payment"
          >
            {offer.price === 0 ? "Free" : `${offer.price} GHS`}
          </span>
        </div>
        <div className="offer-body">
          <div className="offer-title">
            <h3 title={offer.title}>{offer.title}</h3>
          </div>
          <p className="offer-distance">
            <MapPin size={13} />
            {zone?.name}
            <span>·</span>
            {offer.distance?.toFixed(1)} km
          </p>
          <div className="offer-footer">
            <span className="host">
              <span className="avatar small">{offer.initials}</span>
              <span>
                {offer.host.split(" ")[0]}
                <small>Until {offer.until}</small>
              </span>
            </span>
            <button
              className="text-button"
              onClick={() => setOfferDetail(offer)}
            >
              {booked ? "Request sent" : "View offer"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderPredictionCard() {
    return (
      <section className="panel prediction-card">
        <div className="panel-heading">
          <h2>
            <Sparkles size={18} />
            One step ahead
          </h2>
          <span className="tiny-tag">ESTIMATE</span>
        </div>
        <p className="muted">Your neighbourhood · {homeZone.name}</p>
        <div className="prediction-window">
          <span className="prediction-icon">
            <ZapOff size={21} />
          </span>
          <div>
            <strong>{forecast.summary}</strong>
            <span>
              {forecast.lowData
                ? "Estimate · not enough data for this neighbourhood"
                : `${forecast.probability}% at the peak`}
            </span>
          </div>
        </div>
        <RiskChart forecast={forecast} />
        {/* Task 105: the colour follows the level, never green when confidence is low. */}
        <div className="confidence" data-level={forecast.confidenceLevel}>
          <span>{capitalize(forecast.confidenceLevel)} confidence</span>
          <strong>
            {forecast.confidence}% <ShieldCheck size={14} />
          </strong>
        </div>
        <div className="confidence-track" data-level={forecast.confidenceLevel}>
          <span style={{ width: `${forecast.confidence}%` }} />
        </div>
        <p className="prediction-note">
          {forecastSourceLabel(forecast)}. An estimate, not a guarantee: check
          the official ECG announcements.
        </p>
        <Link href="/forecast" className="text-button prediction-link">
          Understand the forecast
          <ArrowRight size={15} />
        </Link>
      </section>
    );
  }

  function renderCommunityFeed(compact = false) {
    const reports = [...state.reports]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter((report) => {
        const zone = zones.find((item) => item.id === report.neighborhoodId);
        return `${zone?.name} ${report.author} ${report.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
      })
      .slice(0, compact ? 3 : 30);
    return (
      <div className="community-feed">
        {reports.length ? (
          reports.map((report) => (
            <article className="feed-item" key={report.id}>
              <span className={`feed-icon ${report.status}`}>
                {report.status === "powered" ? (
                  <Zap size={17} />
                ) : (
                  <ZapOff size={17} />
                )}
              </span>
              <div>
                <strong>
                  {
                    zones.find((zone) => zone.id === report.neighborhoodId)
                      ?.name
                  }
                  <span>
                    {report.status === "powered"
                      ? "Power is back"
                      : report.status === "unstable"
                        ? "Likely outage"
                        : "Outage reported"}
                  </span>
                </strong>
                <p>
                  {report.author} · {formatTime(report.createdAt)} ·{" "}
                  {new Date(report.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </p>
                {!compact && report.description && (
                  <p className="feed-description">{report.description}</p>
                )}
              </div>
              <span className="feed-tag">Community</span>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <Users size={28} />
            <h3>No reports found</h3>
            <p>Try another neighbourhood or contribute your first report.</p>
            <button
              className="button secondary"
              onClick={() => openDialog("report")}
            >
              Report my neighbourhood
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderMapPanel(full = false) {
    return (
      <section className={`panel map-panel ${full ? "map-full" : ""}`}>
        <div className="panel-heading">
          <div>
            <h2>
              {full ? "Accra and its pilot neighbourhoods" : "Accra, Ghana"}
            </h2>
            {full && <p>Spot outages and energy points nearby.</p>}
          </div>
          {!full && (
            <Link
              href="/map"
              className="icon-button"
              aria-label="Expand the map"
            >
              <ArrowUpRight size={19} />
            </Link>
          )}
        </div>
        <div className="map-toolbar">
          <div className="segmented-control" aria-label="Map layers">
            {(
              [
                { id: "all", name: "Show all" },
                { id: "outages", name: "Outages" },
                { id: "energy", name: "Energy" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                aria-pressed={layer === item.id}
                className={layer === item.id ? "active" : ""}
                onClick={() => setLayer(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <button
            className="text-button location-button"
            onClick={locate}
            disabled={locating}
          >
            <Compass size={15} />
            {locating ? "Locating…" : "Locate me"}
          </button>
        </div>
        <EnergyMap
          neighborhoods={zones}
          offers={shownOffers}
          selectedId={selectedId}
          onSelect={(id) => {
            const offer = shownOffers.find((item) => item.id === id);
            if (offer) setOfferDetail(offer);
            else {
              setSelectedId(id);
              setFocus(null);
            }
          }}
          layer={layer}
          focus={focus}
          liveState={live.zones ? "ready" : live.state}
        />
        <div className="map-bottom">
          <div className="map-legend">
            <span>
              <i className="powered" />
              Power on
            </span>
            <span>
              <i className="unstable" />
              Likely outage
            </span>
            <span>
              <i className="outage" />
              Outage reported
            </span>
            <span>
              <i className="planned" />
              Announced outage (ECG)
            </span>
            <span>
              <i className="energy" />
              Energy to share
            </span>
          </div>
          <span className="map-update">
            {live.state === "off"
              ? "Simulated data"
              : live.zones
                ? live.zones.some((row) => Number(row.simulated_reports) > 0)
                  ? "Live · includes simulated reports"
                  : "Residents’ reports, live"
                : live.state === "loading"
                  ? "Connecting to live data…"
                  : "Live data unavailable"}
          </span>
        </div>
        <div className="neighborhood-detail">
          <span className={`neighborhood-symbol ${selected.status}`}>
            <MapPin size={20} />
          </span>
          <div>
            <strong>{selected.name}</strong>
            <span>
              {selected.reports} reports ·{" "}
              {latestSelectedReport
                ? `latest: ${formatTime(latestSelectedReport.createdAt)}`
                : "no recent detail"}
            </span>
          </div>
          <Status status={selected.status} />
          <button
            className="text-button"
            onClick={() => {
              setReportStatus("outage");
              openDialog("report");
            }}
          >
            Report
            <Plus size={15} />
          </button>
        </div>
        {full && (
          <div className="zone-list" aria-label="Pilot neighbourhoods">
            {matchingZones.length ? (
              matchingZones.map((zone) => (
                <button
                  key={zone.id}
                  className={selectedId === zone.id ? "selected" : ""}
                  aria-label={`${zone.name}, ${zone.reports} reports, ${statusLabels[zone.status]}`}
                  aria-pressed={selectedId === zone.id}
                  onClick={() => {
                    setSelectedId(zone.id);
                    setFocus([zone.lat, zone.lng]);
                  }}
                >
                  <span>
                    {zone.name}
                    <small>{zone.reports} reports</small>
                  </span>
                  <Status status={zone.status} />
                </button>
              ))
            ) : (
              <p className="muted">No neighbourhood matches the search.</p>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <AppShell
      search={search}
      onSearch={setSearch}
      onDialog={(next) => {
        if (next === "report") setReportStatus("outage");
        openDialog(next);
      }}
      profile={state.profile}
      liveState={live.zones ? "ready" : live.state}
      sourceCounts={{
        solar: shownOffers.filter(
          (offer) => offer.available && offer.source === "solar",
        ).length,
        generator: shownOffers.filter(
          (offer) => offer.available && offer.source === "generator",
        ).length,
        battery: shownOffers.filter(
          (offer) => offer.available && offer.source === "battery",
        ).length,
      }}
      zones={zones}
      offerCount={shownOffers.filter((offer) => offer.available).length}
      bookingCount={shownBookings.length}
      online={online}
    >
      {view !== "dashboard" && (
        <div className="page-intro">
          <p>
            {view === "map"
              ? "Outages and energy points in ten Accra neighbourhoods."
              : view === "forecast"
                ? "Transparent estimates to plan your day."
                : view === "sharing"
                  ? "Neighbours ready to share, sorted from nearest to farthest."
                  : view === "community"
                    ? "Every report helps the neighbourhood get organised."
                    : "Your demo profile and preferences."}
          </p>
          {view === "sharing" && (
            <button
              className="button primary"
              onClick={() => openDialog("offer")}
            >
              <Plus size={16} />
              Publish an offer
            </button>
          )}
        </div>
      )}
      {view === "dashboard" && (
        <Dashboard
          homeZone={homeZone}
          zones={zones}
          selectedId={selectedId}
          outageCount={
            zones.some((zone) => zone.status === "unknown")
              ? null
              : activeOutages
          }
          offerCount={shownOffers.filter((offer) => offer.available).length}
          reportCount={state.reports.length}
          offers={offers.map((offer) => renderOfferCard(offer))}
          map={renderMapPanel()}
          prediction={renderPredictionCard()}
          community={renderCommunityFeed(true)}
          onSelect={(id) => {
            setSelectedId(id);
            setFocus(null);
          }}
          onClearSearch={() => setSearch("")}
        />
      )}
      {view === "map" && renderMapPanel(true)}

      {view === "forecast" && (
        <>
          <div className="prediction-page-grid">
            <section className="panel forecast-main">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    YOUR NEIGHBOURHOOD · {homeZone.name.toUpperCase()}
                  </span>
                  <h2>The rhythm of your power</h2>
                </div>
                <span className="tiny-tag">
                  {forecastSourceLabel(forecast).toUpperCase()}
                </span>
              </div>
              <div className="forecast-kpi">
                <div>
                  <span>Likely window</span>
                  <strong>
                    {forecast.windowStart} <i>–</i> {forecast.windowEnd}
                  </strong>
                </div>
                <div>
                  <span>Peak risk</span>
                  <strong>{forecast.probability}%</strong>
                </div>
                <div>
                  <span>{capitalize(forecast.confidenceLevel)} confidence</span>
                  <strong>{forecast.confidence}%</strong>
                </div>
              </div>
              <RiskChart forecast={forecast} detailed />
              <div className="forecast-insight">
                <Sparkles size={21} />
                <p>
                  <strong>{forecast.summary}.</strong>
                  {forecast.insight}
                </p>
              </div>
              <Link href="/sharing" className="button primary">
                Find a solution
                <ArrowRight size={16} />
              </Link>
            </section>
            <section className="panel methodology">
              <span className="method-icon">
                <ShieldCheck size={27} />
              </span>
              <h2>
                An estimate,
                <br />
                in full transparency.
              </h2>
              <p>
                These figures come from official ECG announcements and the
                neighbourhood’s past outages. Every parameter is sourced or
                recalibrated with residents’ answers.
              </p>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <strong>ECG schedules</strong>
                    <p>Outages announced by the ECG for your neighbourhood.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Neighbourhood history</strong>
                    <p>Frequency and median duration of outages.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Community reports</strong>
                    <p>Recent contributions to refine the estimate.</p>
                  </div>
                </li>
              </ol>
              <span className="method-note">
                A forecast shows a possibility, never a certainty.
              </span>
            </section>
          </div>
          <div className="two-columns">
            <section className="panel schedule-panel">
              <div className="panel-heading">
                <h2>
                  <Clock3 size={18} />
                  ECG schedule
                </h2>
                <span className="tiny-tag">{homeZone.name}</span>
              </div>
              {currentAnnouncement && (
                <div
                  className="announcement-question"
                  role="group"
                  aria-labelledby="announcement-question-title"
                >
                  <p className="announcement-meta">
                    {currentAnnouncement.demo && (
                      <span className="tiny-tag">DEMO</span>
                    )}
                    {currentAnnouncement.demo
                      ? "Today · demo scenario"
                      : `${formatDay(currentAnnouncement.startsAt)} · ${formatTime(currentAnnouncement.startsAt)}–${formatTime(currentAnnouncement.endsAt)} GMT`}
                  </p>
                  <h3 id="announcement-question-title">Do you have power?</h3>
                  <p>
                    {currentAnnouncement.demo
                      ? "Demo announcement: the ECG published nothing for your neighbourhood today."
                      : `Outage announced by the ECG: ${currentAnnouncement.localities}.`}
                  </p>
                  <div className="announcement-actions">
                    <button
                      type="button"
                      className="button secondary"
                      aria-pressed={currentAnswer?.status === "powered"}
                      onClick={() => answerAnnouncement(true)}
                    >
                      Yes, I have power
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      aria-pressed={currentAnswer?.status === "outage"}
                      onClick={() => answerAnnouncement(false)}
                    >
                      No, it’s off
                    </button>
                  </div>
                  {currentAnswer && (
                    <p className="announcement-answer" role="status">
                      Answer saved:{" "}
                      {currentAnswer.status === "powered"
                        ? "power available"
                        : "outage"}
                      . You can change it.
                    </p>
                  )}
                  <span className="method-note">
                    Your answers check whether announcements are kept. Only the
                    number of answers is used in the calculation.
                  </span>
                </div>
              )}
              {pastAnnouncements.length > 0 ? (
                <ul className="announcement-list">
                  {pastAnnouncements.map((item) => (
                    <li key={item.id}>
                      <strong>
                        {formatDay(item.startsAt)} · {formatTime(item.startsAt)}
                        –{formatTime(item.endsAt)}
                      </strong>
                      <span>
                        {item.localities}
                        {item.partial ? " (partial)" : ""}
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-button"
                      >
                        ECG source
                        <ArrowUpRight size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="announcement-empty">
                  No recent ECG announcement for {homeZone.name}.
                </p>
              )}
              <a
                href="https://www.ecg.com.gh/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-button"
              >
                Visit ECG
                <ArrowUpRight size={16} />
              </a>
            </section>
            <section className="panel schedule-panel">
              <div className="panel-heading">
                <h2>
                  <Activity size={18} />
                  Data quality
                </h2>
                <span className="tiny-tag">ESTIMATE</span>
              </div>
              <div className="empty-state">
                <Activity size={32} />
                <h3>
                  {forecast.announced
                    ? "Outage announced by the ECG"
                    : "Few days observed"}
                </h3>
                <p>
                  {forecast.announced
                    ? "Confidence measures the share of ECG announcements actually kept; your answers to “Do you have power?” adjust it."
                    : "Without an announcement, confidence reflects the number of outage days observed in the neighbourhood. It grows with your reports."}
                </p>
              </div>
            </section>
          </div>
        </>
      )}

      {view === "sharing" && (
        <>
          {/*
          <div className="sharing-banner">
            <span className="sharing-icon">
              <HeartHandshake size={28} />
            </span>
            <div>
              <h2>Your surplus. Their next chapter.</h2>
              <p>
                A charged phone, an open shop, finished homework.
              </p>
            </div>
            <span className="sharing-note">
              <ShieldCheck size={16} />
              No payment in this version
            </span>
          </div>
          */}
          <div className="market-toolbar">
            <div className="source-filters">
              {(
                [
                  {
                    id: "all",
                    label: "All energy",
                    icon: SlidersHorizontal,
                  },
                  { id: "solar", label: "Solar", icon: Sun },
                  { id: "generator", label: "Generator", icon: Zap },
                  {
                    id: "battery",
                    label: "Battery",
                    icon: BatteryCharging,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  aria-pressed={source === item.id}
                  onClick={() => setSource(item.id)}
                  className={source === item.id ? "active" : ""}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="market-meta">
              <span className="sharing-note">
                <ShieldCheck size={14} />
                No payment in this version
              </span>
              <span className="sort-label">
                <ArrowDownLeft size={15} />
                Nearest first
              </span>
            </div>
          </div>
          <div className="result-heading">
            <strong>{offers.length} offers available</strong>
            <span>Around {homeZone.name} · approximate distances</span>
          </div>
          <div className="offers-grid marketplace">
            {offers.map((offer) => renderOfferCard(offer))}
          </div>
          {offers.length === 0 && (
            <div className="panel empty-state">
              <Zap size={32} />
              <h3>No matching offer</h3>
              <p>Try another energy source or share your own.</p>
              <button
                className="button secondary"
                onClick={() => {
                  setSource("all");
                  setSearch("");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
          {shownBookings.length > 0 && (
            <section className="panel requests-panel">
              <div className="panel-heading">
                <h2>{liveEnabled ? "My requests" : "My simulated requests"}</h2>
                <span className="tiny-tag">
                  {shownBookings.length} REQUEST(S)
                </span>
              </div>
              {shownBookings.map((booking) => {
                const offer = shownOffers.find(
                  (item) => item.id === booking.offerId,
                );
                return (
                  <div className="request-row" key={booking.id}>
                    <span className="stat-icon amber">
                      <Clock3 size={19} />
                    </span>
                    <div>
                      <strong>{offer?.title ?? "Offer unavailable"}</strong>
                      <span>
                        {liveEnabled && booking.status
                          ? booking.address &&
                            (booking.status === "accepted" ||
                              booking.status === "finished")
                            ? `${requestStatusLabels[booking.status]} · ${booking.address}`
                            : requestStatusLabels[booking.status]
                          : "Waiting for acceptance · no owner contacted"}
                      </span>
                    </div>
                    {liveEnabled ? (
                      isActiveBooking(booking) && (
                        <>
                          {booking.status === "accepted" && (
                            <button
                              className="text-button"
                              onClick={() =>
                                void sharing.run((db) =>
                                  setLiveRequestStatus(
                                    db,
                                    booking.id,
                                    "finished",
                                  ),
                                )
                              }
                            >
                              Finish
                            </button>
                          )}
                          <button
                            className="text-button"
                            onClick={() =>
                              void sharing.run((db) =>
                                setLiveRequestStatus(
                                  db,
                                  booking.id,
                                  "cancelled",
                                ),
                              )
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )
                    ) : (
                      <button
                        className="text-button"
                        onClick={() =>
                          save(
                            (previous) => ({
                              ...previous,
                              bookings: previous.bookings.filter(
                                (item) => item.id !== booking.id,
                              ),
                            }),
                            "Simulated request cancelled.",
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          )}
          {liveEnabled && sharing.data.places.length > 0 && (
            // Task 91: the whole neighbourhood is cut, the database proposes fixed places.
            <section className="panel requests-panel">
              <div className="panel-heading">
                <h2>Energy places a little further away</h2>
                <span className="tiny-tag">NEIGHBOURHOOD CUT</span>
              </div>
              {sharing.data.places.map((place) => (
                <div className="request-row" key={place.id}>
                  <span className="stat-icon amber">
                    <MapPin size={19} />
                  </span>
                  <div>
                    <strong>{place.name}</strong>
                    <span>
                      {zones.find((zone) => zone.id === place.zoneId)?.name ??
                        place.zoneId}{" "}
                      · {place.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                </div>
              ))}
            </section>
          )}
          {liveEnabled && sharing.data.incoming.length > 0 && (
            <section className="panel requests-panel">
              <div className="panel-heading">
                <h2>Requests received on my offers</h2>
                <span className="tiny-tag">
                  {sharing.data.incoming.length} REQUEST(S)
                </span>
              </div>
              {sharing.data.incoming.map((request) => (
                <div className="request-row" key={request.id}>
                  <span className="stat-icon amber">
                    <HeartHandshake size={19} />
                  </span>
                  <div>
                    <strong>{request.offerTitle}</strong>
                    <span>
                      {requestStatusLabels[request.status]} ·{" "}
                      {formatTime(request.createdAt)}
                      {request.message ? ` · “${request.message}”` : ""}
                    </span>
                  </div>
                  {request.status === "pending" && (
                    <>
                      <button
                        className="text-button"
                        onClick={() =>
                          void sharing.run((db) =>
                            setLiveRequestStatus(db, request.id, "accepted"),
                          )
                        }
                      >
                        Accept
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          void sharing.run((db) =>
                            setLiveRequestStatus(db, request.id, "refused"),
                          )
                        }
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {request.status === "accepted" && (
                    <button
                      className="text-button"
                      onClick={() =>
                        void sharing.run((db) =>
                          setLiveRequestStatus(db, request.id, "finished"),
                        )
                      }
                    >
                      Finish
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
          {liveEnabled && sharing.notice && (
            <p role="alert" className="form-error">
              {sharing.notice}
            </p>
          )}
        </>
      )}

      {view === "community" && (
        <div className="community-page-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>The voice of your neighbourhood</h2>
                <p>Community reports from the demo scenario.</p>
              </div>
              <span className="tiny-tag">
                {state.reports.length} CONTRIBUTIONS
              </span>
            </div>
            {renderCommunityFeed()}
          </section>
          <div className="community-side">
            <section className="community-callout">
              <Users size={31} />
              <h2>
                Your report
                <br />
                makes a difference.
              </h2>
              <p>
                An outage? Power back? Help your neighbours know where things
                stand.
              </p>
              <button
                className="button primary"
                onClick={() => openDialog("report")}
              >
                <Plus size={17} />
                Contribute
              </button>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>10 neighbourhoods, one network</h2>
              </div>
              <div className="community-zones">
                {zones.map((zone) => (
                  <Link href={`/map?zone=${zone.id}`} key={zone.id}>
                    <span>
                      <MapPin size={14} />
                      {zone.name}
                    </span>
                    <span className={`status-dot ${zone.status}`} />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {view === "settings" && (
        <div className="settings-grid">
          <section className="panel settings-panel">
            <div className="panel-heading">
              <h2>My profile</h2>
              <span className="tiny-tag">DEMO</span>
            </div>
            <form
              onSubmit={submitProfile}
              key={`${state.profile.name}-${state.profile.neighborhoodId}`}
            >
              <label className="field">
                Your name
                <input
                  name="name"
                  defaultValue={state.profile.name}
                  required
                  minLength={2}
                  maxLength={50}
                />
              </label>
              <label className="field">
                Your neighbourhood
                <select
                  name="neighborhood"
                  defaultValue={state.profile.neighborhoodId}
                >
                  {zones.map((zone) => (
                    <option value={zone.id} key={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-note">
                This profile is saved only in your browser.
              </p>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <button className="button primary" type="submit">
                <Check size={17} />
                Save
              </button>
            </form>
          </section>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <h2>Demo preferences</h2>
            </div>
            <div className="preference-row">
              <div>
                <strong>Alerts in the demo</strong>
                <p>Show local requests and contributions.</p>
              </div>
              <button
                className={`toggle ${state.notificationsEnabled ? "on" : ""}`}
                role="switch"
                aria-checked={state.notificationsEnabled}
                aria-label="Alerts in the demo"
                onClick={() =>
                  save(
                    (previous) => ({
                      ...previous,
                      notificationsEnabled: !previous.notificationsEnabled,
                    }),
                    "Preference saved.",
                  )
                }
              >
                <span />
              </button>
            </div>
            <div className="privacy-note">
              <ShieldCheck size={22} />
              <p>
                No payment, no password stored, no data shared with the team.
                Map tiles are loaded from OpenStreetMap.
              </p>
            </div>
            <button
              className="button danger-outline"
              onClick={() => openDialog("reset")}
            >
              Reset local data
            </button>
          </section>
        </div>
      )}

      <footer className="app-footer">
        <span>
          <Radio size={12} />
          {liveEnabled
            ? "Accra, Ghana · live reports from residents"
            : "Interactive prototype · simulated data in Accra"}
        </span>
        <span>
          {liveEnabled
            ? "Forecasts from official ECG announcements"
            : "Scenario of 4 Oct 2026 · nothing is sent to the network"}
        </span>
      </footer>
      {dialog === "report" && (
        <Modal
          title="Your neighbourhood has something to say."
          onClose={() => setDialog(null)}
        >
          <p className="modal-intro">
            One report, and your neighbours are better informed.
          </p>
          <form onSubmit={submitReport}>
            <div className="report-options">
              <button
                type="button"
                aria-pressed={reportStatus === "outage"}
                className={reportStatus === "outage" ? "selected outage" : ""}
                onClick={() => setReportStatus("outage")}
              >
                <ZapOff size={26} />
                <strong>No power</strong>
                <span>Report an outage</span>
              </button>
              <button
                type="button"
                aria-pressed={reportStatus === "powered"}
                className={reportStatus === "powered" ? "selected powered" : ""}
                onClick={() => setReportStatus("powered")}
              >
                <Zap size={26} />
                <strong>Power is back</strong>
                <span>Tell my neighbours</span>
              </button>
            </div>
            <label className="field">
              Neighbourhood
              <select name="neighborhood" defaultValue={selectedId}>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Any detail? <span>optional</span>
              <textarea
                name="description"
                placeholder="E.g. My whole street is affected…"
                maxLength={280}
                rows={3}
              />
            </label>
            <p className="form-note">
              <ShieldCheck size={15} />
              {liveEnabled
                ? "Your report is shared with the neighbourhood. Your location is never shown."
                : "Local simulation: this report will not be sent to the network."}
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="button primary full-width" type="submit">
              <Radio size={17} />
              Confirm report
            </button>
          </form>
        </Modal>
      )}

      {dialog === "offer" && (
        <Modal title="Energy starts with you." onClose={() => setDialog(null)}>
          <p className="modal-intro">
            Publish your surplus in the neighbourhood. No payment in V1.
          </p>
          <form onSubmit={submitOffer}>
            <label className="field">
              Title of your offer
              <input
                name="title"
                required
                minLength={3}
                maxLength={80}
                placeholder="E.g. Solar charging at Ama’s"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Source
                <select name="source">
                  <option value="solar">Solar</option>
                  <option value="generator">Generator</option>
                  <option value="battery">Battery</option>
                </select>
              </label>
              <label className="field">
                Neighbourhood
                <select
                  name="neighborhood"
                  defaultValue={state.profile.neighborhoodId}
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Devices welcome
              <input
                name="capacity"
                required
                maxLength={80}
                placeholder="E.g. Phones and laptops"
              />
            </label>
            <div className="form-grid three">
              <label className="field">
                Contribution (GHS)
                <input
                  name="price"
                  type="number"
                  min={0}
                  max={1000}
                  step={0.5}
                  defaultValue={0}
                  required
                />
              </label>
              <label className="field">
                Available places
                <input
                  name="slots"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={3}
                  required
                />
              </label>
              <label className="field">
                Available until
                <input name="until" type="time" required defaultValue="21:00" />
              </label>
            </div>
            <label className="field">
              Details <span>optional</span>
              <textarea
                name="description"
                rows={2}
                maxLength={500}
                placeholder="Describe how you host people, without the exact address."
              />
            </label>
            {liveEnabled && (
              <label className="field">
                Exact address <span>optional, private</span>
                <input
                  name="address"
                  maxLength={200}
                  placeholder="E.g. Blue house after the pharmacy"
                />
              </label>
            )}
            <p className="form-note">
              <MapPin size={15} />
              {liveEnabled
                ? "Only the neighbourhood is public. The exact address is shown only to neighbours you accept."
                : "Only the neighbourhood will be visible. Do not publish your exact address."}
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="button primary full-width" type="submit">
              <HeartHandshake size={17} />
              Publish the demo offer
            </button>
          </form>
        </Modal>
      )}

      {offerDetail && (
        <Modal title={offerDetail.title} onClose={() => setOfferDetail(null)}>
          <div className={`offer-detail-visual ${offerDetail.source}`}>
            <Image
              className="offer-photo"
              src={`/images/${offerDetail.source}.png`}
              alt="Generated illustration for this demo offer"
              fill
              sizes="540px"
            />
            <span>{sourceLabels[offerDetail.source]}</span>
          </div>
          <div className="detail-host">
            <span className="avatar">{offerDetail.initials}</span>
            <div>
              <strong>{offerDetail.host}</strong>
              <span>
                {
                  zones.find((zone) => zone.id === offerDetail.neighborhoodId)
                    ?.name
                }{" "}
                · approximate location
              </span>
            </div>
          </div>
          <p className="offer-description">
            {offerDetail.description ||
              "A neighbour shares their energy to help you get on with your day."}
          </p>
          <div className="offer-detail-grid">
            <span>
              <BatteryCharging size={18} />
              <small>For your devices</small>
              <strong>{offerDetail.capacity}</strong>
            </span>
            <span>
              <Clock3 size={18} />
              <small>
                {liveEnabled ? "Available" : "Simulated availability"}
              </small>
              <strong>Until {offerDetail.until}</strong>
            </span>
            <span>
              <Users size={18} />
              <small>Capacity</small>
              <strong>{offerDetail.slots} place(s)</strong>
            </span>
            <span>
              <HeartHandshake size={18} />
              <small>Suggested contribution</small>
              <strong>
                {offerDetail.price === 0 ? "Free" : `${offerDetail.price} GHS`}
              </strong>
            </span>
          </div>
          <p className="form-note">
            <ShieldCheck size={16} />
            {liveEnabled
              ? "The exact address appears in “My requests” when the host accepts. No payment through LightLink."
              : "The exact address will be available after acceptance in the connected version. No payment here."}
          </p>
          {liveEnabled && offerDetail.own ? (
            <button
              className="button secondary full-width"
              onClick={() => {
                const open = !offerDetail.available;
                void sharing
                  .run((db) => setLiveOfferOpen(db, offerDetail.id, open))
                  .then((failure) =>
                    setToast(
                      failure ?? (open ? "Offer reopened." : "Offer paused."),
                    ),
                  );
                setOfferDetail(null);
              }}
            >
              {offerDetail.available ? "Pause my offer" : "Reopen my offer"}
            </button>
          ) : (
            <button
              className="button primary full-width"
              disabled={
                !offerDetail.available ||
                shownBookings.some(
                  (booking) =>
                    isActiveBooking(booking) &&
                    booking.offerId === offerDetail.id,
                )
              }
              onClick={() => requestEnergy(offerDetail)}
            >
              {shownBookings.some(
                (booking) =>
                  isActiveBooking(booking) &&
                  booking.offerId === offerDetail.id,
              ) ? (
                <>
                  <CheckCheck size={17} />
                  Request already saved
                </>
              ) : (
                <>
                  <ArrowRight size={17} />
                  {liveEnabled
                    ? "Request a place"
                    : "Simulate an energy request"}
                </>
              )}
            </button>
          )}
          {liveEnabled && !offerDetail.own && (
            <details className="abuse-report">
              <summary>Report this offer</summary>
              {[
                "Unfair price",
                "Misleading or fake offer",
                "Inappropriate behaviour",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="text-button"
                  onClick={() => {
                    const offerId = offerDetail.id;
                    void sharing
                      .run((db) => reportLiveAbuse(db, offerId, reason))
                      .then((failure) =>
                        setToast(
                          failure ??
                            "Thank you, the LightLink team will review this offer.",
                        ),
                      );
                    setOfferDetail(null);
                  }}
                >
                  {reason}
                </button>
              ))}
            </details>
          )}
        </Modal>
      )}

      {dialog === "auth" && (
        <Modal
          title="Welcome to the neighbourhood."
          onClose={() => setDialog(null)}
          wide
        >
          <div className="auth-layout">
            <div className="auth-brand-panel">
              <Brand />
              <h3>
                One community.
                <br />
                A thousand ways
                <br />
                to keep the lights on.
              </h3>
              <EnergyArtwork />
              <p>Accra, Ghana · LightLink Squad</p>
            </div>
            <div>
              <div className="auth-tabs">
                <button
                  aria-pressed={authMode === "login"}
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => setAuthMode("login")}
                >
                  Sign in
                </button>
                <button
                  aria-pressed={authMode === "register"}
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => setAuthMode("register")}
                >
                  Sign up
                </button>
              </div>
              <h3 className="auth-title">
                {authMode === "register"
                  ? "Join the community"
                  : "Good to see you again"}
              </h3>
              <p className="modal-intro">
                {liveEnabled
                  ? "Create an account to keep your profile and get alerts for your neighbourhood."
                  : "Demo screen: try the sign-up flow, nothing leaves this browser."}
              </p>
              <form onSubmit={submitProfile}>
                <label className="field">
                  Your name
                  <input
                    name="name"
                    defaultValue={state.profile.name}
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  Password
                  <span className="password-field">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      autoComplete={
                        authMode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                <label className="field">
                  Your neighbourhood
                  <select
                    name="neighborhood"
                    defaultValue={state.profile.neighborhoodId}
                  >
                    {zones.map((zone) => (
                      <option value={zone.id} key={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </label>
                {formError && (
                  <p role="alert" className="form-error">
                    {formError}
                  </p>
                )}
                <button className="button primary full-width" type="submit">
                  {liveEnabled
                    ? authMode === "register"
                      ? "Create my account"
                      : "Sign in"
                    : authMode === "register"
                      ? "Try sign-up"
                      : "Try sign-in"}
                  <ArrowRight size={16} />
                </button>
                <p className="form-note">
                  {liveEnabled
                    ? "Your password is encrypted by Supabase. Your location is never shown to others."
                    : "No real account is created. Email and password are neither sent nor stored."}
                </p>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {dialog === "notifications" && (
        <Modal
          title="Your neighbourhood, listening."
          onClose={() => setDialog(null)}
        >
          {/* Point 8 of #9: in live mode the inbox is always readable; the demo preference
              only concerns the demonstration alerts. */}
          {!liveEnabled && !state.notificationsEnabled ? (
            <div className="empty-state">
              <Bell size={30} />
              <h3>Demo alerts turned off</h3>
              <Link
                href="/settings"
                onClick={() => setDialog(null)}
                className="text-button"
              >
                Change my preferences
              </Link>
            </div>
          ) : (
            <>
              {liveEnabled ? (
                <>
                  <p className="modal-intro">
                    Your alerts: outages in your neighbourhoods, ECG reminders,
                    forecasts and energy requests.
                  </p>
                  {sharing.notifications.length === 0 && (
                    <p className="modal-intro">No alerts for now.</p>
                  )}
                  {sharing.notifications.map((item) => (
                    <div className="notification-item" key={item.id}>
                      {item.kind === "outage_in_zone" ? (
                        <ZapOff size={20} />
                      ) : (
                        <Clock3 size={20} />
                      )}
                      <div>
                        <strong>
                          {item.read ? "" : "• "}
                          {item.title}
                        </strong>
                        <p>
                          {item.body} · {formatTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {sharing.notifications.some((item) => !item.read) && (
                    <button
                      className="text-button"
                      onClick={() => void sharing.markRead()}
                    >
                      Mark all as read
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="modal-intro">
                    Local demo activity. No real push notifications.
                  </p>
                  {shownBookings.map((booking) => (
                    <div className="notification-item" key={booking.id}>
                      <Clock3 size={20} />
                      <div>
                        <strong>Your request is saved</strong>
                        <p>
                          {
                            shownOffers.find(
                              (offer) => offer.id === booking.offerId,
                            )?.title
                          }{" "}
                          · simulated, pending
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="notification-item">
                    <Sun size={20} />
                    <div>
                      <strong>Welcome to LightLink</strong>
                      <p>
                        Explore your neighbourhood and try your first report.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </Modal>
      )}

      {dialog === "help" && (
        <Modal title="Light is for sharing." onClose={() => setDialog(null)}>
          <p className="modal-intro">
            LightLink turns local outages into neighbourhood solidarity.
          </p>
          <div className="help-steps">
            <div>
              <Map size={24} />
              <h3>Know</h3>
              <p>
                Check ten pilot neighbourhoods and report an outage or power
                coming back.
              </p>
            </div>
            <div>
              <Sparkles size={24} />
              <h3>Anticipate</h3>
              <p>
                See the outage risk hour by hour, from real ECG announcements,
                with an honest confidence level.
              </p>
            </div>
            <div>
              <HeartHandshake size={24} />
              <h3>Share</h3>
              <p>
                {liveEnabled
                  ? "Publish an offer or request a place. The exact address is shared only once the host accepts. No payment."
                  : "Publish an offer or simulate a request, with no payment and without contacting a real neighbour."}
              </p>
            </div>
          </div>
          <p className="form-note">
            {liveEnabled
              ? "Reports, the map and forecasts are live. No payment goes through LightLink."
              : "Demo mode: the data is simulated and stays in this browser."}
          </p>
          <button
            className="button primary full-width"
            onClick={() => setDialog(null)}
          >
            Let’s go
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}

      {dialog === "reset" && (
        <Modal title="Reset your demo?" onClose={() => setDialog(null)}>
          <p className="modal-intro">
            This deletes your reports, offers, requests and preferences on this
            device, then restores the initial examples.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDialog(null)}
            >
              Keep my data
            </button>
            <button
              className="button danger"
              onClick={() => {
                save(() => initialState, "The demo data has been reset.");
                setSelectedId(initialState.profile.neighborhoodId);
                updateDisplay(() => defaultDisplay);
                setDialog(null);
              }}
            >
              Reset
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={18} />
          </span>
          <p>{toast}</p>
          <button
            aria-label="Close notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </AppShell>
  );
}
