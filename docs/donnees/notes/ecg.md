# ecg: les données officielles

**ECG** = Electricity Company of Ghana, la société d'électricité. Elle publie des calendriers de coupures.

## Fichiers

| Fichier | Contenu | Colonnes |
|---|---|---|
| `pdf/ECG_LoadMgt_Schedule_2023.pdf` | Le communiqué officiel: coupures du 30 mars au 7 avril 2023, de 18h à 23h, causées par la maintenance de Ghana Gas à Atuabo | PDF |
| `ecg_load_management_2023_zones.csv` | Les localités du PDF: 2 310 lignes, 7 régions (Accra, Tema, Ashanti, Volta, Eastern, Western, Central), groupes A à D | `region`, `groupe`, `zone_ou_localite`, `partielle` (oui si le PDF dit « Parts of ») |
| `ecg_horaires_2023.csv` | Quel groupe est coupé chaque jour | `date`, `jour`, `debut`, `fin`, `groupe`, `motif`, `source` |
| `zones_pilotes_vs_groupes_2023.csv` | Nos 10 quartiers pilotes retrouvés dans le PDF | `zone_id_lightlink`, `region_ecg`, `groupe`, `localite_ecg`, `partielle` |
| `ecg_delestage_2026_avril.csv` | Les 4 blocs de 6 heures du délestage d'avril 2026 | `bloc`, `debut`, `fin`, `description` |

## Ce qu'on apprend en les lisant

- **Accra** compte 134 localités dans le groupe A, 117 dans B, 131 dans C et 123 dans D.
- **Madina** et **East Legon** sont dans le groupe A. **Labone** est surtout dans B. **Achimota** est dans B, C et D selon la partie. **Cantonments** est dans B et D.
- **Tema Community 1** est en **groupe D**: le PDF l'écrit « Comm. 1 Market » et « Presby Church Comm. 1 Casino », sans « Tema » (une première lecture l'avait manqué). Son groupe 2026 est inconnu: 3news n'a pas de page pour Comm. 1.
- Le calendrier de 2023 tourne dans l'ordre A, B, C, D, A, B, C, D, A, un groupe par soir.

## Avril 2026 (pas de fichier de zones)

D'après la presse, l'ECG a annoncé un délestage national à partir du **25 avril 2026**, en trois groupes A, B et C, par blocs de 6 heures (06h-12h, 12h-18h, 18h-00h, 00h-06h), à cause d'un déficit d'environ 800 MW lié à Akosombo. Le même jour, un responsable de l'ECG a dit à la radio qu'un calendrier n'était pas nécessaire: les sources se contredisent. Le fichier `ecg_delestage_2026_avril.csv` décrit seulement la forme des blocs, **pas** quel groupe est coupé à quelle heure.

L'outil [3news Dumsor Timetable](https://3news.com/tools/dumsor) permet de chercher un quartier et son groupe (2 552 localités). Il ne propose aucune API ni téléchargement.

## Comment ces fichiers ont été faits

Le PDF a été téléchargé depuis le site de l'ECG, converti en texte, puis découpé par un script en lignes (région, groupe, localité). Les localités séparées par des virgules sont devenues une ligne chacune.
