# Les données externes de LightLink: mode d'emploi

Les données elles-mêmes sont dans le dossier **[data/](../../data/)** à la racine du dépôt. Ce dossier-ci (`docs/donnees/`) contient tout le reste: les explications, les sources, les prompts et les fichiers bruts.

## La règle du dossier `data/`

- **Que des tableaux CSV**, tous avec **les mêmes 16 colonnes** (voir plus bas).
- **Le nom du sous-dossier dit d'où viennent les données.**
- Une ligne = une localité concernée par une coupure un jour donné.

```text
data/
├── ecg_pdf/    le communiqué PDF officiel de l'ECG (2023)       5 171 lignes
├── presse/     articles de presse qui reprennent l'ECG (2025, 2026)  186 lignes
├── x/          publications @ECGghOfficial sur X (2025, 2026)     142 lignes
├── instagram/  publications @ecgghofficial sur Instagram (2026)    79 lignes
└── 3news/      groupes de délestage d'avril 2026  1 136 lignes
```

Les fichiers s'appellent `ecg_annonces_<année>.csv`.

## Les 16 colonnes

| Colonne | Contenu |
|---|---|
| `date_coupure` | jour de la coupure (AAAA-MM-JJ) |
| `region_ecg` | région telle que l'ECG la donne: `Accra East`, `Accra West`, `Greater Accra` (quand l'Est et l'Ouest ne sont pas distingués), `Tema`, `Central`, `Eastern`, `Volta`, `Ashanti`, `Western` |
| `localite` | une localité par ligne |
| `heure_debut`, `heure_fin` | HH:MM, vide si inconnu |
| `type` | `planned` (maintenance), `emergency`, `fault` (panne), `load_shedding` (délestage) |
| `groupe` | groupe de délestage A à D, vide si non applicable |
| `motif` | raison donnée par l'ECG |
| `restauration` | `oui` si le retour du courant est annoncé |
| `heure_restauration` | HH:MM, vide si inconnu |
| `date_publication`, `heure_publication` | quand l'annonce a été publiée |
| `compte` | qui a publié (le compte ou le média) |
| `url_post` | lien de la publication ou de l'article |
| `source_type` | `texte`, `image` ou `pdf` |
| `remarque` | précisions: « et zones environnantes », corrections faites, doutes |

## Ce qui est ici, dans `docs/donnees/`

| Élément | Contenu |
|---|---|
| `BILAN_DONNEES.md` | la quantité de données, ce qui manque |
| `SOURCES.csv` | toutes les sources, avec lien, date de récolte et licence connue |
| `notes/` | les explications écrites pendant la récolte (certains chemins `data/...` y sont ceux de l'**ancienne organisation**) |
| `brut/` | les fichiers reçus tels quels, avant mise au même format. **`meta_ecg_annonces_2023_rejete.csv`** est un fichier rejeté, voir plus bas |
| `reference/` | tableaux d'autre forme: horaires 2023, blocs 2026, quartiers pilotes face aux groupes ECG |
| `comptes/` | les comptes et pages trouvés par les agents IA |
| `prompts/` | les prompts pour l'agent X et l'agent Meta |
| `pdf/` | le PDF de l'ECG (2023) et 2 articles de recherche |
| `scripts/` | `build_data.py` reconstruit `data/` depuis `brut/`; `scrape_3news.py` récupère les groupes |

Pour refaire `data/` à partir de `brut/`: `python3 -I docs/donnees/scripts/build_data.py` depuis la racine du dépôt.

## Corrections faites aux données des agents

| Problème | Ce que j'ai fait |
|---|---|
| L'agent Meta avait daté les coupures du 20 mai en **2024**. L'article est du 19 mai **2026** | Années corrigées en 2026, notées dans `remarque` |
| Les « données Facebook » viennent en réalité d'**Instagram** (annonces d'octobre 2026) et de **presse** (2025) | Rangées sous `instagram/` et `presse/`, pas sous `facebook/` |
| L'agent Meta a envoyé **les mêmes 17 localités du groupe A pour les 9 jours** de 2023 (153 lignes) | **Rejeté.** Le PDF officiel montre que les groupes A, B, C, D tournent un par jour. Seulement 7 de ces 17 noms correspondent au PDF. Les données 2023 viennent du PDF. Fichier gardé dans `brut/` |
| Les régions n'ont pas partout la même précision (`Accra East` et `Accra West` d'un côté, `Greater Accra` de l'autre) | Laissées telles quelles. À normaliser dans la base avec une table de correspondance |
| Caractère invisible (BOM) en début de fichier | Retiré |
| Lignes identiques en double | Supprimées |

## Ce qui n'est pas dans `data/` (formats différents)

- **Témoignages d'habitants**: aucun trouvé par les agents (fichiers vides).
- **Capteurs nLine**: jeu de données public, accès par un tableau de bord, licence non précisée. Voir `notes/nline.md`.
- **Études scientifiques**: voir `notes/recherche.md`.
