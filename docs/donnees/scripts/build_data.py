"""Rebuilds data/ so that every CSV has the same 16 columns (format "annonces").

Run from the repository root with: python3 -I docs/donnees/scripts/build_data.py
Inputs are the raw files kept in docs/donnees/brut/. Outputs go to data/<source>/.
"""
import csv, os, re, sys

COLS = ["date_coupure","region_ecg","localite","heure_debut","heure_fin","type","groupe","motif",
        "restauration","heure_restauration","date_publication","heure_publication","compte",
        "url_post","source_type","remarque"]
RAW = "docs/donnees/brut"
OUT = "data"

def read(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def write(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    seen, clean = set(), []
    for r in rows:
        row = {c: (r.get(c) or "").strip() for c in COLS}
        key = tuple(row[c] for c in COLS)
        if key in seen:
            continue
        seen.add(key); clean.append(row)
    clean.sort(key=lambda r: (r["date_coupure"], r["region_ecg"], r["localite"]))
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS, lineterminator="\n")
        w.writeheader(); w.writerows(clean)
    print(path, len(clean))

# ---- X
write(f"{OUT}/x/ecg_annonces_2026.csv", read(f"{RAW}/x_ecg_annonces_2026.csv"))
write(f"{OUT}/x/ecg_annonces_2025.csv", read(f"{RAW}/x_ecg_annonces_2025.csv"))
# ---- Instagram (agent "Meta")
write(f"{OUT}/instagram/ecg_annonces_2026.csv", read(f"{RAW}/meta_ecg_annonces_instagram_2026.csv"))

# ---- Presse
presse25 = read(f"{RAW}/meta_ecg_annonces_presse_2025.csv")
for r in presse25:
    r["compte"] = "Graphic Online (reprend un communiqué de l'ECG)"
write(f"{OUT}/presse/ecg_annonces_2025.csv", presse25)

presse26 = read(f"{RAW}/meta_ecg_annonces_presse_2026_05_20.csv")
for r in presse26:
    r["compte"] = "Adom Online (reprend un communiqué de l'ECG)"
for r in read(f"{RAW}/presse_ecg_pannes_planifiees_2026.csv"):
    if not r["localites"].strip():
        continue
    outlet = "Graphic Online" if "graphic" in r["source_url"] else "MyJoyOnline"
    for loc in [x.strip() for x in r["localites"].split(";") if x.strip()]:
        fault = "poteau haute tension" in loc
        presse26.append({
            "date_coupure": r["date"], "region_ecg": r["region_ecg"], "localite": re.sub(r"\s*\(poteau.*\)", "", loc),
            "heure_debut": r["debut"], "heure_fin": r["fin"], "type": r["type"], "groupe": "",
            "motif": "burnt high-tension pole" if fault else "planned maintenance", "restauration": "non",
            "date_publication": r["date_publication"], "compte": f"{outlet} (reprend un communiqué de l'ECG)",
            "url_post": r["source_url"], "source_type": "texte", "remarque": "et zones environnantes"})
write(f"{OUT}/presse/ecg_annonces_2026.csv", presse26)

# ---- PDF officiel de l'ECG (2023): un jour de coupure par couple groupe/date
days = {"A": ["2023-03-30","2023-04-03","2023-04-07"], "B": ["2023-03-31","2023-04-04"],
        "C": ["2023-04-01","2023-04-05"], "D": ["2023-04-02","2023-04-06"]}
reg = {"Accra": "Greater Accra"}
pdf_rows = []
for r in read(f"{RAW}/ecg_pdf_zones_2023.csv"):
    for d in days[r["groupe"]]:
        pdf_rows.append({
            "date_coupure": d, "region_ecg": reg.get(r["region"], r["region"]), "localite": r["zone_ou_localite"],
            "heure_debut": "18:00", "heure_fin": "23:00", "type": "load_shedding", "groupe": r["groupe"],
            "motif": "GNGC maintenance at Atuabo (load management)", "restauration": "non",
            "date_publication": "", "compte": "Electricity Company of Ghana (communiqué PDF)",
            "url_post": "https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf", "source_type": "pdf",
            "remarque": "partie du quartier seulement (« Parts of »)" if r["partielle"] == "oui" else ""})
write(f"{OUT}/ecg_pdf/ecg_annonces_2023.csv", pdf_rows)

# ---- 3news (groupes de délestage d'avril 2026), si le scrape est terminé
p = f"{RAW}/3news_groupes_2026.csv"
if os.path.exists(p):
    rows = []
    for r in read(p):
        rows.append({
            "date_coupure": r["valide_du"], "region_ecg": "Greater Accra" if r["region"].lower().startswith("greater") else r["region"],
            "localite": r["localite"], "type": "load_shedding", "groupe": r["groupe"],
            "motif": "national load shedding (Akosombo shortfall)", "restauration": "non",
            "date_publication": r["date_recolte"], "compte": "3news (outil Dumsor Timetable, source ECG/GRIDCo)",
            "url_post": r["url"], "source_type": "texte",
            "remarque": f"groupe valide du {r['valide_du']} au {r['valide_au']}; rotation de 6 h, heures non publiées"})
    write(f"{OUT}/3news/ecg_annonces_2026.csv", rows)
