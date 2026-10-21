"""
LightLink - Modèle de risque de coupure (rules-v2.0)

Principe: aucune donnée simulée. Le risque d'un quartier à une heure donnée combine
trois composantes, chacune tracée vers une source (voir PARAMS et prediction/README.md):

  1. ANNONCE   Une coupure officielle (ECG: maintenance, urgence, panne) couvre l'heure.
               Source: data/{instagram,x,presse}. Ce n'est pas une prédiction, c'est un fait annoncé.
  2. TAUX DE BASE  Probabilité qu'une coupure (planifiée / non planifiée) touche le quartier
               un jour donné, estimée sur la seule fenêtre de collecte non biaisée, puis
               lissée par un estimateur bayésien (Beta-Binomial) vers la moyenne des 10 quartiers.
  3. DÉLESTAGE (optionnel) Régime national de délestage (avril 2026): un groupe sur trois
               est coupé à chaque bloc de 6 h, donc 1/3 de risque, l'ordre de rotation n'étant pas publié.

Le Ghana est à GMT toute l'année: heure locale = UTC. Toutes les heures ci-dessous sont UTC.
Python standard uniquement (aucune dépendance).
"""

from __future__ import annotations

import csv
import math
import re
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

MODEL_VERSION = "rules-v2.0"
METHOD = "rules"  # valeur autorisée par predictions.method (schema.sql)

# 12 créneaux affichés par le composant RiskChart du front.
CHART_HOURS = (6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 23)

# Sources de coupures datées. ecg_pdf = calendrier officiel de délestage (2023) avec date, heures et
# localité: chaque ligne est une annonce, exactement comme une maintenance. C'est le canal par lequel un
# futur calendrier de délestage entrera dans le modèle (même format à 16 colonnes dans data/).
# 3news (avril 2026) est exclu: il donne le groupe de chaque localité mais aucune heure.
# saisie = annonces ECG recopiées à la main par l'équipe (tâche 64, data/saisie/README.md). Elles comptent
# comme annonces (horaires de l'app, prévision du jour annoncé) mais pas pour l'estimation des taux: ce
# n'est pas un balayage complet, ses jours sans annonce ne prouvent rien (voir MANUAL_SOURCE).
ANNOUNCEMENT_SOURCES = ("instagram", "x", "presse", "ecg_pdf", "saisie")
MANUAL_SOURCE = "saisie"

# Fiabilité des annonces: prior Beta de moyenne 0,90 (PROXY Eversource, distributeur américain: travaux
# tenus « environ 90 % du temps ») et de poids 10 observations, donc faible: 80 % de la masse entre 0,77
# et 0,99. Il est remplacé par les mesures LightLink dès qu'elles existent (voir announcement_reliability).
RELIABILITY_PRIOR_MEAN = 0.90
RELIABILITY_PRIOR_STRENGTH = 10.0
# Annonce partielle (« Parts of X », sous-localité): probabilité qu'un habitant du quartier soit coupé.
# Elle combine fiabilité et part du quartier touchée, d'où un prior centré sur 0,90 × 0,5 = 0,45
# (0,5: on ignore quelle part est touchée) et de poids 2, presque uniforme.
PARTIAL_PRIOR_MEAN = RELIABILITY_PRIOR_MEAN * 0.5
PARTIAL_PRIOR_STRENGTH = 2.0


@dataclass(frozen=True)
class Params:
    """Paramètres du modèle. Chaque valeur porte sa provenance:
    DONNÉE (mesurée dans data/), LITTÉRATURE (étude citée) ou HYPOTHÈSE (jugement, à recalibrer)."""

    # HYPOTHÈSE: force du prior = nombre de quartier-jours "virtuels" venant de la moyenne des 10 quartiers.
    prior_strength: float = 20.0
    # LITTÉRATURE (Klugman et al. 2021, IPSN): les capteurs détectent « presque deux fois plus de
    # coupures » que l'ECG n'en observe. Appliqué au taux de coupures non planifiées.
    unreported_factor: float = 2.0
    # LITTÉRATURE (idem): durée moyenne d'une coupure mesurée à Accra = 1,7 h.
    mean_unplanned_duration_min: int = 102
    # PROXY puis MESURE: moyenne a posteriori de la fiabilité des annonces (RELIABILITY_PRIOR_*).
    # Sans mesure LightLink, vaut la moyenne du prior: 0,90.
    announced_active_p: float = RELIABILITY_PRIOR_MEAN
    # CONVENTION puis MESURE: probabilité d'être coupé quand l'annonce ne vise qu'une partie du quartier.
    # Sans mesure: 0,45. Les circuits sont en grille et non par rue (Eversource): un habitant d'une zone
    # nommée n'est pas sûr d'être coupé.
    announced_partial_p: float = PARTIAL_PRIOR_MEAN
    # DONNÉE (docs/donnees/reference/ecg_delestage_2026_avril.csv): 3 groupes, un coupé par bloc de 6 h.
    load_shedding_p: float = 1.0 / 3.0


PARAMS = Params()


# --------------------------------------------------------------------------------------
# Quartiers pilotes
# --------------------------------------------------------------------------------------

ZONES: Dict[str, Tuple[str, "re.Pattern[str]"]] = {
    "osu": ("Osu", re.compile(r"\bosu\b")),
    "labone": ("Labone", re.compile(r"\blabone\b")),
    "east-legon": ("East Legon", re.compile(r"\beast legon\b")),
    "adabraka": ("Adabraka", re.compile(r"\badabraka\b")),
    "cantonments": ("Cantonments", re.compile(r"\bcantonments\b")),
    "dansoman": ("Dansoman", re.compile(r"\bdansoman\b")),
    "airport-residential": ("Airport Residential", re.compile(r"\bairport res")),
    "achimota": ("Achimota", re.compile(r"\bachimota\b")),
    "madina": ("Madina", re.compile(r"\bmadina\b")),
    # Le PDF ECG 2023 écrit « Comm. 1 Market », sans « Tema ». « Lakeside Community 1 & 8 » est un autre lieu.
    "tema-community-1": (
        "Tema Community 1",
        re.compile(r"(?<!lake )(?<!lakeside )(?<!lake side )\bcomm(?:unity)?\.?\s*(?:1|one)\b(?!\s*\d)"),
    ),
}

_PART_PREFIX = re.compile(r"^(?:parts?|portions?) of\s+")


def match_zone(localite: str) -> Optional[Tuple[str, bool]]:
    """Retourne (zone_id, partielle) si la localité annoncée appartient à un quartier pilote.

    partielle=True quand l'annonce ne désigne pas le quartier entier (« Parts of X »,
    « X Estate and its environs », « UN Madina », ...)."""
    text = " ".join((localite or "").lower().split())
    for zone_id, (name, pattern) in ZONES.items():
        if pattern.search(text):
            bare = _PART_PREFIX.sub("", text)
            exact = bare == name.lower() and bare == text
            return zone_id, not exact
    return None


def match_row(row: dict) -> Optional[Tuple[str, bool]]:
    """match_zone limité au Grand Accra et à Tema: le PDF ECG couvre tout le Ghana et
    « Ahwiaa Adabraka » (Ashanti) n'est pas Adabraka. Région vide (certains posts X): acceptée."""
    region = (row.get("region_ecg") or "").lower()
    if region and "accra" not in region and "tema" not in region:
        return None
    return match_zone(row.get("localite", ""))


# --------------------------------------------------------------------------------------
# Annonces ECG
# --------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Announcement:
    zone_id: str
    day: date
    kind: str  # planned | emergency | fault | load_shedding
    start_min: Optional[int]  # minutes depuis 00:00 UTC, None si heure inconnue
    end_min: Optional[int]
    partial: bool


def _hhmm(value: str) -> Optional[int]:
    value = (value or "").strip()
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", value)
    if not m:
        return None
    hours, minutes = int(m.group(1)), int(m.group(2))
    if hours > 24 or minutes > 59:
        return None
    return hours * 60 + minutes


def load_rows(data_dir: Path = DATA_DIR, sources: Sequence[str] = ANNOUNCEMENT_SOURCES) -> List[dict]:
    rows: List[dict] = []
    for source in sources:
        for path in sorted((data_dir / source).glob("*.csv")):
            with path.open(encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    row["src"] = source
                    rows.append(row)
    return rows


def parse_announcements(rows: Iterable[dict], params: Params = PARAMS) -> List[Announcement]:
    """Transforme les lignes CSV en annonces par quartier pilote (dédoublonnées)."""
    seen = set()
    out: List[Announcement] = []
    for row in rows:
        kind = (row.get("type") or "").strip()
        if kind not in ("planned", "emergency", "fault", "load_shedding"):
            continue
        hit = match_row(row)
        if hit is None:
            continue
        try:
            day = date.fromisoformat(row["date_coupure"])
        except (KeyError, ValueError):
            continue
        zone_id, partial = hit
        start, end = _hhmm(row.get("heure_debut", "")), _hhmm(row.get("heure_fin", ""))
        if kind == "fault" and start is None:
            # Panne sans horaire: début = heure de publication si elle date du jour même,
            # fin = heure de rétablissement annoncée, sinon durée moyenne mesurée (Klugman 2021).
            published = _hhmm(row.get("heure_publication", ""))
            if published is not None and row.get("date_publication") == row.get("date_coupure"):
                start = published
                restored = _hhmm(row.get("heure_restauration", ""))
                end = restored if restored is not None and restored > start else start + params.mean_unplanned_duration_min
        if end is not None and start is not None and end <= start:
            start = end = None
        key = (zone_id, day, kind, start, end, partial)
        if key in seen:
            continue
        seen.add(key)
        out.append(Announcement(zone_id, day, kind, start, end, partial))
    return out


# --------------------------------------------------------------------------------------
# Estimation des taux
# --------------------------------------------------------------------------------------


@dataclass(frozen=True)
class ExposureWindow:
    start: date
    end: date  # inclus

    @property
    def days(self) -> List[date]:
        return [self.start + timedelta(days=i) for i in range((self.end - self.start).days + 1)]


def exposure_window(rows: Iterable[dict]) -> ExposureWindow:
    """Fenêtre où l'absence d'annonce signifie réellement « pas de coupure annoncée ».

    Début = premier jour couvert par le balayage quotidien du compte Instagram de l'ECG.
    Fin = dernière date de publication connue (au-delà, les annonces sont incomplètes).
    Les autres jours (2025, mai/juin 2026) ne sont PAS dans la fenêtre: ces fichiers ont été
    collectés quand une coupure existait, compter leurs jours sans coupure serait un biais."""
    rows = list(rows)
    starts = [r["date_coupure"] for r in rows if r["src"] == "instagram" and r.get("date_coupure")]
    if not starts:
        raise ValueError("aucune donnée instagram: impossible de définir la fenêtre d'exposition")
    start = date.fromisoformat(min(starts))
    published = [
        r["date_publication"]
        for r in rows
        if r.get("date_publication") and r.get("date_coupure", "") >= min(starts) and r["src"] != MANUAL_SOURCE
    ]
    return ExposureWindow(start, date.fromisoformat(max(published)))


def shrunk_rate(events: int, days: int, pooled: float, prior_strength: float) -> float:
    """Estimateur Beta-Binomial: moyenne a posteriori d'une Beta(k·p0, k·(1-p0)) après `events` succès sur `days` essais."""
    return (prior_strength * pooled + events) / (prior_strength + days)


def announcement_reliability(held: int, observed: int) -> float:
    """Fiabilité des annonces mise à jour par les mesures LightLink (Beta-Binomial conjugué).

    observed = annonces pour lesquelles des habitants de la zone ont répondu « coupé » ou « pas coupé »
    pendant la fenêtre annoncée; held = celles où la coupure a eu lieu. Exemple: 0 mesure → 0,90;
    18 tenues sur 20 → 0,90; 10 sur 20 → 0,63. Le prior pèse 10 annonces: les données dominent vite."""
    return shrunk_rate(held, observed, RELIABILITY_PRIOR_MEAN, RELIABILITY_PRIOR_STRENGTH)


def partial_announcement_estimate(cut: int, answered: int) -> float:
    """Probabilité d'être coupé lors d'une annonce partielle: habitants coupés / habitants ayant répondu."""
    return shrunk_rate(cut, answered, PARTIAL_PRIOR_MEAN, PARTIAL_PRIOR_STRENGTH)


def _flag(value: object) -> bool:
    return str(value).strip().lower() in ("t", "true", "1")


def calibrate(outcomes: Iterable[dict], params: Params = PARAMS) -> Tuple[Params, Dict[str, int]]:
    """Recalibre les deux paramètres à partir de la vue Supabase `announcement_outcomes` (export CSV).

    Annonce complète: tenue si plus d'habitants coupés qu'avec du courant (égalité = non concluante).
    Annonce partielle: chaque réponse compte. Seules les fenêtres terminées avec au moins une réponse comptent."""
    held = observed = cut = answered = 0
    for row in outcomes:
        if not _flag(row.get("finished")):
            continue
        residents_cut, residents_powered = int(row["residents_cut"]), int(row["residents_powered"])
        if residents_cut + residents_powered == 0:
            continue
        if _flag(row.get("partial")):
            cut += residents_cut
            answered += residents_cut + residents_powered
        elif residents_cut != residents_powered:
            observed += 1
            held += residents_cut > residents_powered
    summary = {"held": held, "observed": observed, "cut": cut, "answered": answered}
    calibrated = replace(
        params,
        announced_active_p=announcement_reliability(held, observed),
        announced_partial_p=partial_announcement_estimate(cut, answered),
    )
    return calibrated, summary


def load_outcomes(path: Path) -> List[dict]:
    with Path(path).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def pooled_rate(events: int, trials: int) -> float:
    """Taux commun aux 10 quartiers, lissé par un prior de Jeffreys Beta(0,5; 0,5)."""
    return (events + 0.5) / (trials + 1.0)


@dataclass
class ZoneRates:
    plan: float  # P(au moins une coupure planifiée un jour donné)
    unplanned: float  # P(au moins une coupure non planifiée annoncée un jour donné)
    days: int  # jours observés
    plan_events: int
    unplanned_events: int


def estimate_rates(
    announcements: Sequence[Announcement], window: ExposureWindow, params: Params = PARAMS, holdout: Optional[date] = None
) -> Dict[str, ZoneRates]:
    """Taux par quartier sur la fenêtre. `holdout` retire un jour (backtest leave-one-day-out)."""
    days = [d for d in window.days if d != holdout]
    day_set = set(days)
    plan = {z: set() for z in ZONES}
    unplanned = {z: set() for z in ZONES}
    for a in announcements:
        if a.day in day_set:
            if a.kind == "planned":
                plan[a.zone_id].add(a.day)
            elif a.kind in ("emergency", "fault"):
                unplanned[a.zone_id].add(a.day)
            # load_shedding: régime national, pas un événement de quartier, n'entre pas dans les taux.
    n = len(days)
    pooled_plan = pooled_rate(sum(len(v) for v in plan.values()), n * len(ZONES))
    pooled_unpl = pooled_rate(sum(len(v) for v in unplanned.values()), n * len(ZONES))
    return {
        z: ZoneRates(
            plan=shrunk_rate(len(plan[z]), n, pooled_plan, params.prior_strength),
            unplanned=shrunk_rate(len(unplanned[z]), n, pooled_unpl, params.prior_strength),
            days=n,
            plan_events=len(plan[z]),
            unplanned_events=len(unplanned[z]),
        )
        for z in ZONES
    }


def planned_hour_profile(rows: Iterable[dict]) -> List[float]:
    """f(h) = part des fenêtres de maintenance planifiée annoncées (toutes localités, toutes dates)
    qui couvrent l'heure h. Mesuré, pas supposé: les maintenances ECG tombent en journée (≈ 9h-17h)."""
    windows = set()
    for r in rows:
        if r.get("type") != "planned" or r.get("src") == MANUAL_SOURCE:
            continue
        s, e = _hhmm(r.get("heure_debut", "")), _hhmm(r.get("heure_fin", ""))
        if s is not None and e is not None and e > s and r.get("date_coupure"):
            windows.add((r["date_coupure"], s, e))
    if not windows:
        return [0.0] * 24
    return [sum(1 for _, s, e in windows if s < (h + 1) * 60 and e > h * 60) / len(windows) for h in range(24)]


# --------------------------------------------------------------------------------------
# Risque horaire et prédiction
# --------------------------------------------------------------------------------------


def _combine(*probabilities: float) -> float:
    """P(au moins un événement) pour des événements indépendants."""
    miss = 1.0
    for p in probabilities:
        miss *= 1.0 - min(max(p, 0.0), 1.0)
    return 1.0 - miss


def announced_coverage(announcements: Sequence[Announcement], zone_id: str, day: date, hour: int, params: Params = PARAMS) -> float:
    """Probabilité que l'heure soit couverte par une annonce (0 si aucune). Plusieurs annonces: la plus forte."""
    best = 0.0
    for a in announcements:
        if a.zone_id != zone_id or a.day != day or a.start_min is None or a.end_min is None:
            continue
        if a.start_min < (hour + 1) * 60 and a.end_min > hour * 60:
            best = max(best, params.announced_partial_p if a.partial else params.announced_active_p)
    return best


def hourly_risk(
    zone_id: str,
    day: date,
    rates: ZoneRates,
    announcements: Sequence[Announcement],
    plan_profile: Sequence[float],
    params: Params = PARAMS,
    load_shedding: bool = False,
) -> List[float]:
    """Risque (0-1) pour chacune des 24 heures du jour `day`."""
    unplanned_daily = min(1.0, rates.unplanned * params.unreported_factor)
    duration_share = min(1.0, params.mean_unplanned_duration_min / 1440.0)
    risks = []
    for h in range(24):
        # Profil horaire plat: les sources se contredisent (voir README), aucun poids n'est défendable.
        unplanned = unplanned_daily * duration_share
        announced = announced_coverage(announcements, zone_id, day, h, params)
        if announced > 0:
            # L'annonce remplace le taux de maintenance de cette heure (déjà connue).
            parts = [announced, unplanned]
        else:
            parts = [rates.plan * plan_profile[h], unplanned]
        if load_shedding:
            parts.append(params.load_shedding_p)
        risks.append(_combine(*parts))
    return risks


@dataclass
class Prediction:
    zone_id: str
    day: date
    probability: int
    confidence: int
    window_start: datetime
    window_end: datetime
    expected_duration_min: int
    hourly_risks: List[int]
    announced: bool
    basis: str = ""
    method: str = METHOD
    model_version: str = MODEL_VERSION


def predict_zone(
    zone_id: str,
    day: date,
    rates: ZoneRates,
    announcements: Sequence[Announcement],
    plan_profile: Sequence[float],
    params: Params = PARAMS,
    load_shedding: bool = False,
) -> Prediction:
    risks = hourly_risk(zone_id, day, rates, announcements, plan_profile, params, load_shedding)
    peak = max(range(24), key=lambda h: risks[h])
    threshold = 0.5 * risks[peak]
    lo = hi = peak
    while lo > 0 and risks[lo - 1] >= threshold:
        lo -= 1
    while hi < 23 and risks[hi + 1] >= threshold:
        hi += 1
    midnight = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    length_min = max((hi - lo + 1) * 60, params.mean_unplanned_duration_min)
    announced = any(announced_coverage(announcements, zone_id, day, h, params) > 0 for h in range(24))
    if announced:
        confidence = round(100 * params.announced_active_p)
        basis = "annonce ECG"
    else:
        # Part des données réelles dans l'estimation: n/(n+k). Peu de jours observés = confiance basse.
        confidence = round(100 * rates.days / (rates.days + params.prior_strength))
        basis = "taux de base"
    if load_shedding:
        basis += " + délestage"
    return Prediction(
        zone_id=zone_id,
        day=day,
        probability=round(100 * risks[peak]),
        confidence=confidence,
        window_start=midnight + timedelta(hours=lo),
        window_end=midnight + timedelta(hours=lo, minutes=length_min),
        expected_duration_min=length_min,
        hourly_risks=[round(100 * risks[h]) for h in CHART_HOURS],
        announced=announced,
        basis=basis,
    )


def predict_all(
    day: date,
    data_dir: Path = DATA_DIR,
    params: Params = PARAMS,
    load_shedding: bool = False,
) -> Tuple[List[Prediction], ExposureWindow]:
    rows = load_rows(data_dir)
    window = exposure_window(rows)
    announcements = parse_announcements(rows, params)
    rates = estimate_rates(announcements, window, params)
    profile = planned_hour_profile(rows)
    predictions = [predict_zone(z, day, rates[z], announcements, profile, params, load_shedding) for z in ZONES]
    return predictions, window


# --------------------------------------------------------------------------------------
# SQL (Supabase)
# --------------------------------------------------------------------------------------


def iso_utc(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def to_sql(predictions: Sequence[Prediction], day: date, window: ExposureWindow) -> str:
    """Script idempotent: remplace les prévisions `rules-v2.0` du jour, dans une transaction."""
    lines = [
        "-- LightLink: prévisions générées par prediction/predict.py (ne pas éditer à la main).",
        f"-- Modèle {MODEL_VERSION} (méthode '{METHOD}'), jour cible {day.isoformat()} (UTC = heure du Ghana).",
        f"-- Taux de base estimés sur la fenêtre {window.start.isoformat()} → {window.end.isoformat()} ({len(window.days)} jours).",
        "-- Rejouable sans doublon: les lignes du même modèle et du même jour sont remplacées.",
        "BEGIN;",
        f"DELETE FROM public.predictions WHERE method = '{METHOD}' AND model_version = '{MODEL_VERSION}'"
        f" AND window_start >= '{day.isoformat()}T00:00:00Z' AND window_start < '{(day + timedelta(days=1)).isoformat()}T00:00:00Z';",
        "INSERT INTO public.predictions",
        "    (zone_id, generated_at, window_start, window_end, probability, confidence, expected_duration_min, hourly_risks, basis, method, model_version)",
        "VALUES",
    ]
    values = []
    for p in predictions:
        values.append(
            f"    ('{p.zone_id}', NOW(), '{iso_utc(p.window_start)}', '{iso_utc(p.window_end)}', "
            f"{p.probability}, {p.confidence}, {p.expected_duration_min}, '{_json_list(p.hourly_risks)}'::jsonb, "
            f"'{p.basis}', '{p.method}', '{p.model_version}')"
        )
    lines.append(",\n".join(values) + ";")
    lines.append("COMMIT;")
    return "\n".join(lines) + "\n"


def _json_list(values: Sequence[int]) -> str:
    return "[" + ", ".join(str(int(v)) for v in values) + "]"


# --------------------------------------------------------------------------------------
# Évaluation (backtest leave-one-day-out)
# --------------------------------------------------------------------------------------


def brier(pairs: Sequence[Tuple[float, int]]) -> float:
    return sum((p - y) ** 2 for p, y in pairs) / len(pairs)


def log_loss(pairs: Sequence[Tuple[float, int]], eps: float = 1e-6) -> float:
    total = 0.0
    for p, y in pairs:
        p = min(max(p, eps), 1 - eps)
        total += -(y * math.log(p) + (1 - y) * math.log(1 - p))
    return total / len(pairs)
