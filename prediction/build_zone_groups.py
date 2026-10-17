"""
LightLink - Génère le rattachement daté quartiers <-> groupes de délestage ECG.

Chaque rattachement porte sa source et sa période de validité, car les groupes changent d'un
délestage à l'autre (Adabraka: A, B et D en 2023, A en 2026). L'ECG attribue les groupes par départ
électrique (feeder), pas par quartier: un même quartier peut donc être dans plusieurs groupes.

Sources lues dans data/, avec le même appariement des noms que le modèle (match_zone):
  - ecg_pdf: calendrier officiel de l'ECG, 30 mars - 7 avril 2023 (groupes A à D);
  - 3news: groupes du délestage national d'avril 2026 (A à C), validité lue dans la colonne remarque.

partiel = aucune localité de ce groupe ne désigne le quartier entier (sous-localité ou « Parts of »).

    python3 prediction/build_zone_groups.py     # réécrit la section balisée des deux fichiers de seed
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

from lightlink_model import DATA_DIR, ZONES, load_rows, match_row

ROOT = Path(__file__).resolve().parent.parent
SEEDS = (ROOT / "backend" / "supabase" / "seed.sql", ROOT / "backend" / "seed.sql")
BEGIN = "-- BEGIN zone_groups (généré par prediction/build_zone_groups.py, ne pas éditer à la main)"
END = "-- END zone_groups"
SOURCES = {"ecg_pdf": "ecg_pdf_2023", "3news": "3news_2026"}
_VALIDITY = re.compile(r"valide du (\d{4}-\d{2}-\d{2}) au (\d{4}-\d{2}-\d{2})")

Key = Tuple[str, str, str]  # zone, groupe, source


def memberships(data_dir: Path = DATA_DIR) -> Dict[Key, dict]:
    """Validité = période du calendrier entier de la source, pas les seuls jours où le groupe est coupé."""
    out: Dict[Key, dict] = {}
    for folder, source in SOURCES.items():
        rows = load_rows(data_dir, (folder,))
        dates = []
        for row in rows:
            m = _VALIDITY.search(row.get("remarque") or "")
            dates += [m.group(1), m.group(2)] if m else [row["date_coupure"]]
        period = (min(dates), max(dates))
        for row in rows:
            group = (row.get("groupe") or "").strip()
            hit = match_row(row)
            if not hit or group not in ("A", "B", "C", "D"):
                continue
            zone, partial = hit
            entry = out.setdefault((zone, group, source), {"partial": True, "period": period, "localities": set()})
            entry["partial"] = entry["partial"] and partial
            entry["localities"].add(row["localite"].strip())
    return out


def to_sql(groups: Dict[Key, dict]) -> str:
    order = list(ZONES)
    rows: List[str] = []
    for zone, group, source in sorted(groups, key=lambda k: (k[2], order.index(k[0]), k[1])):
        g = groups[(zone, group, source)]
        names = ", ".join(sorted(g["localities"])).replace("'", "''")
        rows.append(f"  ('{zone}', '{group}', {str(g['partial']).lower()}, '{source}', '{g['period'][0]}', '{g['period'][1]}'),  -- {names}")
    rows[-1] = rows[-1].replace("),  --", ")  --", 1)
    missing = [z for z in order if not any(k[0] == z and k[2] == "3news_2026" for k in groups)]
    return "\n".join(
        [
            BEGIN,
            "insert into public.ecg_groups (id, label) values",
            "  ('A', 'Groupe A'), ('B', 'Groupe B'), ('C', 'Groupe C'), ('D', 'Groupe D')",
            "on conflict (id) do nothing;",
            "",
            f"-- Sans groupe 2026 connu (absents de 3news): {', '.join(missing)}.",
            "insert into public.zone_groups (zone_id, group_id, is_partial, source, valid_from, valid_to) values",
            *rows,
            "on conflict (zone_id, group_id, source) do nothing;",
            END,
        ]
    )


def write(block: str) -> None:
    for path in SEEDS:
        text = path.read_text(encoding="utf-8")
        if BEGIN in text:
            text = text[: text.index(BEGIN)] + block + text[text.index(END) + len(END) :]
        else:
            text = text.rstrip() + "\n\n" + block + "\n"
        path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    block = to_sql(memberships())
    write(block)
    print(block)
