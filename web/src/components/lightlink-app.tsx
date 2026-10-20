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
} from "@/lib/live";
import { updateDemoState, useDemoState } from "@/lib/demo-store";
import { forecastSourceLabel, getForecast } from "../../../shared/forecast";

const EnergyMap = dynamic(() => import("./energy-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="loading-orbit" />
      <span>Chargement de la carte d’Accra…</span>
    </div>
  ),
});

const sourceLabels = {
  solar: "Solaire",
  generator: "Générateur",
  battery: "Batterie",
};
const sourceIcons = { solar: Sun, generator: Zap, battery: BatteryCharging };
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
  const zones = live.zones
    ? applyLiveStatus(getNeighborhoods(state.reports), live.zones)
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
    state.offers,
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
        : `${message} Stockage indisponible : conservé pour cette session seulement.`,
    );
  }
  function openDialog(next: typeof dialog) {
    setFormError(null);
    setDialog(next);
  }
  function locate() {
    if (!navigator.geolocation) {
      setToast("La géolocalisation n’est pas disponible sur ce navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFocus([position.coords.latitude, position.coords.longitude]);
        setLocating(false);
        setToast(
          "Carte centrée sur votre position. Les exemples restent situés à Accra.",
        );
      },
      () => {
        setLocating(false);
        setToast(
          "Position indisponible. Sélectionnez un quartier dans la liste.",
        );
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
        ? "Signalement envoyé. Merci, la carte se met à jour pour tout le quartier."
        : "Signalement ajouté à votre démo. Merci pour votre contribution !",
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
      "Merci ! Votre réponse aide à vérifier si les annonces ECG sont tenues.",
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
      "Votre offre de démonstration est disponible dans le quartier.",
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
      setFormError("Indiquez un nom de 2 à 50 caractères et un quartier.");
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
          ? "Compte créé. Bienvenue sur LightLink !"
          : "Vous êtes connecté."
        : "Profil de démonstration enregistré. Aucun compte réel n’a été créé.",
    );
    setSelectedId(neighborhoodId);
    setDialog(null);
  }
  function requestEnergy(offer: EnergyOffer) {
    if (
      !offer.available ||
      state.bookings.some((booking) => booking.offerId === offer.id)
    )
      return;
    save(
      (previous) => ({
        ...previous,
        bookings: [
          { id: crypto.randomUUID(), offerId: offer.id, createdAt: now() },
          ...previous.bookings,
        ],
      }),
      "Demande simulée enregistrée. Aucun message n’est envoyé au propriétaire.",
    );
    setOfferDetail(null);
  }

  function renderOfferCard(offer: EnergyOffer & { distance?: number }) {
    const Icon = sourceIcons[offer.source];
    const booked = state.bookings.some(
      (booking) => booking.offerId === offer.id,
    );
    const zone = zones.find((item) => item.id === offer.neighborhoodId);
    return (
      <article className="offer-card" key={offer.id}>
        <div className={`offer-visual ${offer.source}`}>
          <Image
            className="offer-photo"
            src={`/images/${offer.source}.png`}
            alt={`Illustration de ${sourceLabels[offer.source].toLowerCase()} pour cette offre de démonstration`}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 40vw, 320px"
          />
          <span className="offer-source">
            <Icon size={14} />
            {sourceLabels[offer.source]}
          </span>
          <span className="available-badge">
            <span />
            Disponible
          </span>
          <span
            className="offer-price"
            title="Contribution conseillée, sans paiement"
          >
            {offer.price === 0 ? "Gratuit" : `${offer.price} GHS`}
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
                <small>Jusqu’à {offer.until}</small>
              </span>
            </span>
            <button
              className="text-button"
              onClick={() => setOfferDetail(offer)}
            >
              {booked ? "Demande envoyée" : "Voir l’offre"}
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
            Une longueur d’avance
          </h2>
          <span className="tiny-tag">ESTIMATION</span>
        </div>
        <p className="muted">Votre quartier · {homeZone.name}</p>
        <div className="prediction-window">
          <span className="prediction-icon">
            <ZapOff size={21} />
          </span>
          <div>
            <strong>{forecast.headline}</strong>
            <span>
              {forecast.windowStart} – {forecast.windowEnd} <i>·</i>{" "}
              {forecast.probability} % au plus fort
            </span>
          </div>
        </div>
        <RiskChart forecast={forecast} />
        <div className="confidence">
          <span>Confiance</span>
          <strong>
            {forecast.confidence}% <ShieldCheck size={14} />
          </strong>
        </div>
        <div className="confidence-track">
          <span style={{ width: `${forecast.confidence}%` }} />
        </div>
        <p className="prediction-note">
          {forecastSourceLabel(forecast)}. Une estimation, sans garantie :
          vérifiez les annonces officielles ECG.
        </p>
        <Link href="/previsions" className="text-button prediction-link">
          Comprendre la prévision
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
                      ? "Le courant est revenu"
                      : report.status === "unstable"
                        ? "Coupure probable"
                        : "Coupure signalée"}
                  </span>
                </strong>
                <p>
                  {report.author} · {formatTime(report.createdAt)} ·{" "}
                  {new Date(report.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </p>
                {!compact && report.description && (
                  <p className="feed-description">{report.description}</p>
                )}
              </div>
              <span className="feed-tag">Communauté</span>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <Users size={28} />
            <h3>Aucun signalement trouvé</h3>
            <p>
              Essayez un autre quartier ou contribuez avec votre premier
              signalement.
            </p>
            <button
              className="button secondary"
              onClick={() => openDialog("report")}
            >
              Signaler mon quartier
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
            <h2>{full ? "Accra et ses quartiers pilotes" : "Accra, Ghana"}</h2>
            {full && (
              <p>Repérez les coupures et les points d’énergie à proximité.</p>
            )}
          </div>
          {!full && (
            <Link
              href="/carte"
              className="icon-button"
              aria-label="Agrandir la carte"
            >
              <ArrowUpRight size={19} />
            </Link>
          )}
        </div>
        <div className="map-toolbar">
          <div className="segmented-control" aria-label="Couches de la carte">
            {(
              [
                { id: "all", name: "Tout voir" },
                { id: "outages", name: "Coupures" },
                { id: "energy", name: "Énergie" },
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
            {locating ? "Recherche…" : "Me localiser"}
          </button>
        </div>
        <EnergyMap
          neighborhoods={zones}
          offers={state.offers}
          selectedId={selectedId}
          onSelect={(id) => {
            const offer = state.offers.find((item) => item.id === id);
            if (offer) setOfferDetail(offer);
            else {
              setSelectedId(id);
              setFocus(null);
            }
          }}
          layer={layer}
          focus={focus}
        />
        <div className="map-bottom">
          <div className="map-legend">
            <span>
              <i className="powered" />
              Courant OK
            </span>
            <span>
              <i className="unstable" />
              Coupure probable
            </span>
            <span>
              <i className="outage" />
              Coupure signalée
            </span>
            <span>
              <i className="energy" />
              Énergie à partager
            </span>
          </div>
          <span className="map-update">Données simulées</span>
        </div>
        <div className="neighborhood-detail">
          <span className={`neighborhood-symbol ${selected.status}`}>
            <MapPin size={20} />
          </span>
          <div>
            <strong>{selected.name}</strong>
            <span>
              {selected.reports} signalements ·{" "}
              {latestSelectedReport
                ? `dernier : ${formatTime(latestSelectedReport.createdAt)}`
                : "aucun détail récent"}
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
            Signaler
            <Plus size={15} />
          </button>
        </div>
        {full && (
          <div className="zone-list" aria-label="Quartiers pilotes">
            {matchingZones.length ? (
              matchingZones.map((zone) => (
                <button
                  key={zone.id}
                  className={selectedId === zone.id ? "selected" : ""}
                  aria-label={`${zone.name}, ${zone.reports} signalements, ${statusLabels[zone.status]}`}
                  aria-pressed={selectedId === zone.id}
                  onClick={() => {
                    setSelectedId(zone.id);
                    setFocus([zone.lat, zone.lng]);
                  }}
                >
                  <span>
                    {zone.name}
                    <small>{zone.reports} signalements</small>
                  </span>
                  <Status status={zone.status} />
                </button>
              ))
            ) : (
              <p className="muted">
                Aucun quartier ne correspond à la recherche.
              </p>
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
      sourceCounts={{
        solar: state.offers.filter(
          (offer) => offer.available && offer.source === "solar",
        ).length,
        generator: state.offers.filter(
          (offer) => offer.available && offer.source === "generator",
        ).length,
        battery: state.offers.filter(
          (offer) => offer.available && offer.source === "battery",
        ).length,
      }}
      zones={zones}
      offerCount={state.offers.filter((offer) => offer.available).length}
      bookingCount={state.bookings.length}
      online={online}
    >
      {view !== "dashboard" && (
        <div className="page-intro">
          <p>
            {view === "carte"
              ? "Les coupures et les points d’énergie de dix quartiers d’Accra."
              : view === "previsions"
                ? "Des estimations transparentes pour anticiper votre journée."
                : view === "partage"
                  ? "Des voisins prêts à partager, classés du plus proche au plus éloigné."
                  : view === "communaute"
                    ? "Chaque signalement aide le quartier à mieux s’organiser."
                    : "Votre profil et vos préférences de démonstration."}
          </p>
          {view === "partage" && (
            <button
              className="button primary"
              onClick={() => openDialog("offer")}
            >
              <Plus size={16} />
              Publier une offre
            </button>
          )}
        </div>
      )}
      {view === "dashboard" && (
        <Dashboard
          homeZone={homeZone}
          zones={zones}
          selectedId={selectedId}
          outageCount={activeOutages}
          offerCount={state.offers.filter((offer) => offer.available).length}
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
      {view === "carte" && renderMapPanel(true)}

      {view === "previsions" && (
        <>
          <div className="prediction-page-grid">
            <section className="panel forecast-main">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    VOTRE QUARTIER · {homeZone.name.toUpperCase()}
                  </span>
                  <h2>Le rythme de votre énergie</h2>
                </div>
                <span className="tiny-tag">
                  {forecastSourceLabel(forecast).toUpperCase()}
                </span>
              </div>
              <div className="forecast-kpi">
                <div>
                  <span>Créneau probable</span>
                  <strong>
                    {forecast.windowStart} <i>–</i> {forecast.windowEnd}
                  </strong>
                </div>
                <div>
                  <span>Risque au plus fort</span>
                  <strong>{forecast.probability}%</strong>
                </div>
                <div>
                  <span>Confiance</span>
                  <strong>{forecast.confidence}%</strong>
                </div>
              </div>
              <RiskChart forecast={forecast} detailed />
              <div className="forecast-insight">
                <Sparkles size={21} />
                <p>
                  <strong>{forecast.headline}.</strong>
                  {forecast.insight}
                </p>
              </div>
              <Link href="/partage" className="button primary">
                Trouver une solution
                <ArrowRight size={16} />
              </Link>
            </section>
            <section className="panel methodology">
              <span className="method-icon">
                <ShieldCheck size={27} />
              </span>
              <h2>
                Une estimation,
                <br />
                en toute transparence.
              </h2>
              <p>
                Ces chiffres viennent des annonces officielles de l’ECG et des
                coupures passées du quartier. Chaque paramètre est sourcé ou
                recalibré avec les réponses des habitants.
              </p>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <strong>Horaires ECG</strong>
                    <p>Coupures annoncées par l’ECG pour votre quartier.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Historique du quartier</strong>
                    <p>Fréquence et durée médiane des coupures.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Signalements communautaires</strong>
                    <p>Des contributions récentes pour affiner l’estimation.</p>
                  </div>
                </li>
              </ol>
              <span className="method-note">
                Une prévision indique une possibilité, jamais une certitude.
              </span>
            </section>
          </div>
          <div className="two-columns">
            <section className="panel schedule-panel">
              <div className="panel-heading">
                <h2>
                  <Clock3 size={18} />
                  Calendrier ECG
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
                      <span className="tiny-tag">DÉMO</span>
                    )}
                    {currentAnnouncement.demo
                      ? "Aujourd’hui · scénario de démonstration"
                      : `${formatDay(currentAnnouncement.startsAt)} · ${formatTime(currentAnnouncement.startsAt)}–${formatTime(currentAnnouncement.endsAt)} GMT`}
                  </p>
                  <h3 id="announcement-question-title">
                    Avez-vous du courant ?
                  </h3>
                  <p>
                    {currentAnnouncement.demo
                      ? "Annonce de démonstration : l’ECG n’a rien publié pour votre quartier aujourd’hui."
                      : `Coupure annoncée par l’ECG : ${currentAnnouncement.localities}.`}
                  </p>
                  <div className="announcement-actions">
                    <button
                      type="button"
                      className="button secondary"
                      aria-pressed={currentAnswer?.status === "powered"}
                      onClick={() => answerAnnouncement(true)}
                    >
                      Oui, j’ai du courant
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      aria-pressed={currentAnswer?.status === "outage"}
                      onClick={() => answerAnnouncement(false)}
                    >
                      Non, c’est coupé
                    </button>
                  </div>
                  {currentAnswer && (
                    <p className="announcement-answer" role="status">
                      Réponse enregistrée :{" "}
                      {currentAnswer.status === "powered"
                        ? "courant disponible"
                        : "coupure"}
                      . Vous pouvez la modifier.
                    </p>
                  )}
                  <span className="method-note">
                    Vos réponses vérifient si les annonces sont tenues. Seul le
                    nombre de réponses sert au calcul.
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
                        {item.partial ? " (partiel)" : ""}
                      </span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-button"
                      >
                        Source ECG
                        <ArrowUpRight size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="announcement-empty">
                  Aucune annonce ECG récente pour {homeZone.name}.
                </p>
              )}
              <a
                href="https://www.ecg.com.gh/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-button"
              >
                Consulter ECG
                <ArrowUpRight size={16} />
              </a>
            </section>
            <section className="panel schedule-panel">
              <div className="panel-heading">
                <h2>
                  <Activity size={18} />
                  Qualité des données
                </h2>
                <span className="tiny-tag">ESTIMATION</span>
              </div>
              <div className="empty-state">
                <Activity size={32} />
                <h3>
                  {forecast.announced
                    ? "Coupure annoncée par l’ECG"
                    : "Peu de jours observés"}
                </h3>
                <p>
                  {forecast.announced
                    ? "La confiance mesure la part des annonces ECG réellement tenues ; vos réponses à « Avez-vous du courant ? » l’ajustent."
                    : "Sans annonce, la confiance reflète le nombre de jours de coupures observés dans le quartier. Elle monte avec vos signalements."}
                </p>
              </div>
            </section>
          </div>
        </>
      )}

      {view === "partage" && (
        <>
          {/*
          <div className="sharing-banner">
            <span className="sharing-icon">
              <HeartHandshake size={28} />
            </span>
            <div>
              <h2>Votre surplus. Leur prochain chapitre.</h2>
              <p>
                Un téléphone chargé, une boutique ouverte, un devoir terminé.
              </p>
            </div>
            <span className="sharing-note">
              <ShieldCheck size={16} />
              Sans paiement dans cette version
            </span>
          </div>
          */}
          <div className="market-toolbar">
            <div className="source-filters">
              {(
                [
                  {
                    id: "all",
                    label: "Toutes les énergies",
                    icon: SlidersHorizontal,
                  },
                  { id: "solar", label: "Solaire", icon: Sun },
                  { id: "generator", label: "Générateur", icon: Zap },
                  {
                    id: "battery",
                    label: "Batterie",
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
                Sans paiement dans cette version
              </span>
              <span className="sort-label">
                <ArrowDownLeft size={15} />
                Les plus proches d’abord
              </span>
            </div>
          </div>
          <div className="result-heading">
            <strong>{offers.length} offres disponibles</strong>
            <span>Autour de {homeZone.name} · distances approximatives</span>
          </div>
          <div className="offers-grid marketplace">
            {offers.map((offer) => renderOfferCard(offer))}
          </div>
          {offers.length === 0 && (
            <div className="panel empty-state">
              <Zap size={32} />
              <h3>Aucune offre ne correspond</h3>
              <p>Essayez une autre source d’énergie ou partagez la vôtre.</p>
              <button
                className="button secondary"
                onClick={() => {
                  setSource("all");
                  setSearch("");
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
          {state.bookings.length > 0 && (
            <section className="panel requests-panel">
              <div className="panel-heading">
                <h2>Mes demandes simulées</h2>
                <span className="tiny-tag">
                  {state.bookings.length} DEMANDE(S)
                </span>
              </div>
              {state.bookings.map((booking) => {
                const offer = state.offers.find(
                  (item) => item.id === booking.offerId,
                );
                return (
                  <div className="request-row" key={booking.id}>
                    <span className="stat-icon amber">
                      <Clock3 size={19} />
                    </span>
                    <div>
                      <strong>{offer?.title ?? "Offre indisponible"}</strong>
                      <span>
                        En attente d’acceptation · aucun propriétaire contacté
                      </span>
                    </div>
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
                          "Demande simulée annulée.",
                        )
                      }
                    >
                      Annuler
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      {view === "communaute" && (
        <div className="community-page-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>La voix de votre quartier</h2>
                <p>Signalements communautaires du scénario de démonstration.</p>
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
                Votre signalement
                <br />
                fait la différence.
              </h2>
              <p>
                Une coupure ? Le courant est revenu ? Aidez vos voisins à savoir
                où ils en sont.
              </p>
              <button
                className="button primary"
                onClick={() => openDialog("report")}
              >
                <Plus size={17} />
                Contribuer
              </button>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>10 quartiers, un réseau</h2>
              </div>
              <div className="community-zones">
                {zones.map((zone) => (
                  <Link href={`/carte?quartier=${zone.id}`} key={zone.id}>
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

      {view === "parametres" && (
        <div className="settings-grid">
          <section className="panel settings-panel">
            <div className="panel-heading">
              <h2>Mon profil</h2>
              <span className="tiny-tag">DÉMONSTRATION</span>
            </div>
            <form
              onSubmit={submitProfile}
              key={`${state.profile.name}-${state.profile.neighborhoodId}`}
            >
              <label className="field">
                Votre nom
                <input
                  name="name"
                  defaultValue={state.profile.name}
                  required
                  minLength={2}
                  maxLength={50}
                />
              </label>
              <label className="field">
                Votre quartier
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
                Ce profil est enregistré uniquement dans votre navigateur.
              </p>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <button className="button primary" type="submit">
                <Check size={17} />
                Enregistrer
              </button>
            </form>
          </section>
          <section className="panel settings-panel">
            <div className="panel-heading">
              <h2>Préférences de la démo</h2>
            </div>
            <div className="preference-row">
              <div>
                <strong>Alertes dans la démo</strong>
                <p>Afficher les demandes et contributions locales.</p>
              </div>
              <button
                className={`toggle ${state.notificationsEnabled ? "on" : ""}`}
                role="switch"
                aria-checked={state.notificationsEnabled}
                aria-label="Alertes dans la démo"
                onClick={() =>
                  save(
                    (previous) => ({
                      ...previous,
                      notificationsEnabled: !previous.notificationsEnabled,
                    }),
                    "Préférence enregistrée.",
                  )
                }
              >
                <span />
              </button>
            </div>
            <div className="privacy-note">
              <ShieldCheck size={22} />
              <p>
                Aucun paiement, aucun mot de passe enregistré, aucune donnée
                partagée avec l’équipe. Les tuiles de carte sont chargées depuis
                OpenStreetMap.
              </p>
            </div>
            <button
              className="button danger-outline"
              onClick={() => openDialog("reset")}
            >
              Réinitialiser les données locales
            </button>
          </section>
        </div>
      )}

      <footer className="app-footer">
        <span>
          <Radio size={12} />
          Prototype interactif · données simulées à Accra
        </span>
        <span>4 oct. 2026 · Aucun signalement envoyé au réseau</span>
      </footer>
      {dialog === "report" && (
        <Modal
          title="Votre quartier a quelque chose à dire."
          onClose={() => setDialog(null)}
        >
          <p className="modal-intro">
            Un signalement, et vos voisins sont mieux informés.
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
                <strong>Plus de courant</strong>
                <span>Signaler une coupure</span>
              </button>
              <button
                type="button"
                aria-pressed={reportStatus === "powered"}
                className={reportStatus === "powered" ? "selected powered" : ""}
                onClick={() => setReportStatus("powered")}
              >
                <Zap size={26} />
                <strong>Le courant est revenu</strong>
                <span>Informer mes voisins</span>
              </button>
            </div>
            <label className="field">
              Quartier
              <select name="neighborhood" defaultValue={selectedId}>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Une précision ? <span>facultatif</span>
              <textarea
                name="description"
                placeholder="Ex. Toute ma rue est concernée…"
                maxLength={280}
                rows={3}
              />
            </label>
            <p className="form-note">
              <ShieldCheck size={15} />
              Simulation locale : ce signalement ne sera pas envoyé au réseau.
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="button primary full-width" type="submit">
              <Radio size={17} />
              Confirmer le signalement
            </button>
          </form>
        </Modal>
      )}

      {dialog === "offer" && (
        <Modal
          title="L’énergie commence par vous."
          onClose={() => setDialog(null)}
        >
          <p className="modal-intro">
            Publiez votre surplus dans le quartier. Aucun paiement en V1.
          </p>
          <form onSubmit={submitOffer}>
            <label className="field">
              Titre de votre offre
              <input
                name="title"
                required
                minLength={3}
                maxLength={80}
                placeholder="Ex. Recharge solaire chez Ama"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Source
                <select name="source">
                  <option value="solar">Solaire</option>
                  <option value="generator">Générateur</option>
                  <option value="battery">Batterie</option>
                </select>
              </label>
              <label className="field">
                Quartier
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
              Appareils accueillis
              <input
                name="capacity"
                required
                maxLength={80}
                placeholder="Ex. Téléphones et ordinateurs"
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
                Places disponibles
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
                Disponible jusqu’à
                <input name="until" type="time" required defaultValue="21:00" />
              </label>
            </div>
            <label className="field">
              Précisions <span>facultatif</span>
              <textarea
                name="description"
                rows={2}
                maxLength={500}
                placeholder="Indiquez les conditions d’accueil, sans adresse exacte."
              />
            </label>
            <p className="form-note">
              <MapPin size={15} />
              Seul le quartier sera visible. Ne publiez pas votre adresse
              exacte.
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="button primary full-width" type="submit">
              <HeartHandshake size={17} />
              Publier l’offre de démonstration
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
              alt="Visuel d’illustration généré pour cette offre de démonstration"
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
                · position approximative
              </span>
            </div>
          </div>
          <p className="offer-description">
            {offerDetail.description ||
              "Un voisin partage son énergie pour vous aider à poursuivre votre journée."}
          </p>
          <div className="offer-detail-grid">
            <span>
              <BatteryCharging size={18} />
              <small>Pour vos appareils</small>
              <strong>{offerDetail.capacity}</strong>
            </span>
            <span>
              <Clock3 size={18} />
              <small>Disponibilité simulée</small>
              <strong>Jusqu’à {offerDetail.until}</strong>
            </span>
            <span>
              <Users size={18} />
              <small>Capacité d’accueil</small>
              <strong>{offerDetail.slots} place(s)</strong>
            </span>
            <span>
              <HeartHandshake size={18} />
              <small>Contribution conseillée</small>
              <strong>
                {offerDetail.price === 0
                  ? "Gratuit"
                  : `${offerDetail.price} GHS`}
              </strong>
            </span>
          </div>
          <p className="form-note">
            <ShieldCheck size={16} />
            L’adresse exacte sera accessible après acceptation dans la version
            connectée. Aucun paiement ici.
          </p>
          <button
            className="button primary full-width"
            disabled={
              !offerDetail.available ||
              state.bookings.some(
                (booking) => booking.offerId === offerDetail.id,
              )
            }
            onClick={() => requestEnergy(offerDetail)}
          >
            {state.bookings.some(
              (booking) => booking.offerId === offerDetail.id,
            ) ? (
              <>
                <CheckCheck size={17} />
                Demande déjà enregistrée
              </>
            ) : (
              <>
                <ArrowRight size={17} />
                Simuler une demande d’énergie
              </>
            )}
          </button>
        </Modal>
      )}

      {dialog === "auth" && (
        <Modal
          title="Bienvenue dans le quartier."
          onClose={() => setDialog(null)}
          wide
        >
          <div className="auth-layout">
            <div className="auth-brand-panel">
              <Brand />
              <h3>
                Une communauté.
                <br />
                Mille façons
                <br />
                de garder la lumière.
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
                  Connexion
                </button>
                <button
                  aria-pressed={authMode === "register"}
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => setAuthMode("register")}
                >
                  Inscription
                </button>
              </div>
              <h3 className="auth-title">
                {authMode === "register"
                  ? "Rejoignez la communauté"
                  : "Heureux de vous retrouver"}
              </h3>
              <p className="modal-intro">
                Écran de démonstration. L’authentification sera connectée au
                backend après validation de l’équipe.
              </p>
              <form onSubmit={submitProfile}>
                <label className="field">
                  Votre nom
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
                  Adresse e-mail
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  Mot de passe
                  <span className="password-field">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="8 caractères minimum"
                      autoComplete={
                        authMode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                <label className="field">
                  Votre quartier
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
                      ? "Créer mon compte"
                      : "Me connecter"
                    : authMode === "register"
                      ? "Essayer l’inscription"
                      : "Essayer la connexion"}
                  <ArrowRight size={16} />
                </button>
                <p className="form-note">
                  {liveEnabled
                    ? "Votre mot de passe est chiffré par Supabase. Votre position n’est jamais montrée aux autres."
                    : "Aucun compte réel créé. E-mail et mot de passe ne sont ni envoyés ni enregistrés."}
                </p>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {dialog === "notifications" && (
        <Modal
          title="Votre quartier, à l’écoute."
          onClose={() => setDialog(null)}
        >
          {!state.notificationsEnabled ? (
            <div className="empty-state">
              <Bell size={30} />
              <h3>Alertes de démo désactivées</h3>
              <Link
                href="/parametres"
                onClick={() => setDialog(null)}
                className="text-button"
              >
                Modifier mes préférences
              </Link>
            </div>
          ) : (
            <>
              <p className="modal-intro">
                Activité locale de démonstration. Aucune notification push
                réelle.
              </p>
              {state.bookings.map((booking) => (
                <div className="notification-item" key={booking.id}>
                  <Clock3 size={20} />
                  <div>
                    <strong>Votre demande est enregistrée</strong>
                    <p>
                      {
                        state.offers.find(
                          (offer) => offer.id === booking.offerId,
                        )?.title
                      }{" "}
                      · en attente simulée
                    </p>
                  </div>
                </div>
              ))}
              <div className="notification-item">
                <Sun size={20} />
                <div>
                  <strong>Bienvenue dans LightLink</strong>
                  <p>
                    Explorez votre quartier et essayez votre premier
                    signalement.
                  </p>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}

      {dialog === "help" && (
        <Modal title="La lumière se partage." onClose={() => setDialog(null)}>
          <p className="modal-intro">
            LightLink transforme les coupures localisées en solidarité de
            voisinage.
          </p>
          <div className="help-steps">
            <div>
              <Map size={24} />
              <h3>Savoir</h3>
              <p>
                Consultez dix quartiers pilotes et signalez une coupure ou un
                retour du courant.
              </p>
            </div>
            <div>
              <Sparkles size={24} />
              <h3>Anticiper</h3>
              <p>
                Découvrez les écrans de prévision et leur niveau de confiance,
                ici simulés.
              </p>
            </div>
            <div>
              <HeartHandshake size={24} />
              <h3>Partager</h3>
              <p>
                Publiez une offre ou simulez une demande, sans paiement et sans
                contacter de voisin réel.
              </p>
            </div>
          </div>
          <p className="form-note">
            Ce prototype PAN prépare la validation de l’équipe. Les calendriers
            ECG, l’authentification et les échanges réels seront intégrés
            ensuite.
          </p>
          <button
            className="button primary full-width"
            onClick={() => setDialog(null)}
          >
            C’est parti
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}

      {dialog === "reset" && (
        <Modal
          title="Réinitialiser votre démonstration ?"
          onClose={() => setDialog(null)}
        >
          <p className="modal-intro">
            Cela supprime vos signalements, offres, demandes et préférences sur
            cet appareil, puis restaure les exemples initiaux.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDialog(null)}
            >
              Garder mes données
            </button>
            <button
              className="button danger"
              onClick={() => {
                save(
                  () => initialState,
                  "Les données de démonstration ont été réinitialisées.",
                );
                setSelectedId(initialState.profile.neighborhoodId);
                updateDisplay(() => defaultDisplay);
                setDialog(null);
              }}
            >
              Réinitialiser
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
            aria-label="Fermer la notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </AppShell>
  );
}
