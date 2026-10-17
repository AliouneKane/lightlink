"""
LightLink - Importe les horaires officiels de l'ECG (data/) dans la table ecg_schedules.

Source: les annonces datées de data/ (Instagram, X, presse, calendrier de délestage du PDF ECG),
complétées à la main par l'équipe (tâche 64) dans le même format à 16 colonnes. Seules les annonces
avec une heure de début et de fin publiées deviennent des horaires: on n'invente aucune heure.
Une ligne par quartier pilote et par fenêtre; les localités annoncées sont regroupées.

Le SQL produit est rejouable (ON CONFLICT DO NOTHING sur zone, début, fin, type): on peut relancer
l'import chaque jour sans doublon.

    python3 prediction/import_schedules.py                # SQL sur la sortie standard
    python3 prediction/import_schedules.py --write-seed   # réécrit la section balisée de supabase/seed.sql
    python3 prediction/import_schedules.py | psql "$SUPABASE_DB_URL"   # import direct (CI quotidien)
"""

import argparse
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

from lightlink_model import ANNOUNCEMENT_SOURCES, DATA_DIR, _hhmm, load_rows, match_row

SEED = Path(__file__).resolve().parent.parent / "backend" / "supabase" / "seed.sql"
BEGIN = "-- BEGIN ecg_schedules (généré par prediction/import_schedules.py, ne pas éditer à la main)"
END = "-- END ecg_schedules"
KINDS = ("planned", "emergency", "fault", "load_shedding")

Key = Tuple[str, str, str, str, str]  # zone, début, fin, type


def _iso(day: str, minutes: int) -> str:
    moment = date.fromisoformat(day) + timedelta(minutes=minutes) // timedelta(days=1) * timedelta(days=1)
    return f"{moment.isoformat()}T{(minutes // 60) % 24:02d}:{minutes % 60:02d}:00Z"


def schedules(data_dir: Path = DATA_DIR) -> Dict[Key, dict]:
    out: Dict[Key, dict] = {}
    for row in load_rows(data_dir, ANNOUNCEMENT_SOURCES):
        kind = (row.get("type") or "").strip()
        start, end = _hhmm(row.get("heure_debut", "")), _hhmm(row.get("heure_fin", ""))
        hit = match_row(row)
        if kind not in KINDS or hit is None or start is None or end is None or not row.get("date_coupure"):
            continue
        if end <= start:
            end += 24 * 60  # fenêtre qui passe minuit (18:00-00:00 dans les calendriers de délestage)
        zone, partial = hit
        day = row["date_coupure"]
        key = (zone, _iso(day, start), _iso(day, end), kind)
        entry = out.setdefault(key, {"partial": True, "localities": set(), "url": row.get("url_post", "")})
        entry["partial"] = entry["partial"] and partial
        entry["localities"].add(row["localite"].strip())
    return out


def _quote(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def to_sql(items: Dict[Key, dict]) -> str:
    values: List[str] = []
    for (zone, start, end, kind), item in sorted(items.items()):
        localities = ", ".join(sorted(item["localities"]))
        values.append(
            f"  ({_quote(zone)}, {_quote(start)}, {_quote(end)}, {_quote(kind)}, "
            f"{str(item['partial']).lower()}, {_quote(localities)}, {_quote(item['url'])})"
        )
    return "\n".join(
        [
            BEGIN,
            "insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind, partial, localities, source_url) values",
            ",\n".join(values),
            "on conflict (zone_id, starts_at, ends_at, kind) do nothing;",
            END,
        ]
    )


def write_seed(block: str, path: Path = SEED) -> None:
    text = path.read_text(encoding="utf-8")
    if BEGIN in text:
        text = text[: text.index(BEGIN)] + block + text[text.index(END) + len(END) :]
    else:
        text = text.rstrip() + "\n\n" + block + "\n"
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--write-seed", action="store_true", help="réécrit la section balisée de backend/supabase/seed.sql")
    args = parser.parse_args()
    block = to_sql(schedules())
    if args.write_seed:
        write_seed(block)
    print(block)


if __name__ == "__main__":
    main()
