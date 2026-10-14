# data: les données externes de LightLink

Ce dossier rassemble les données **qui ne viennent pas de l'application**: celles qu'on va lui donner pour prévoir les coupures. Elles correspondent aux blocs A, B et C de la section 3 du document « Projet LightLink ».

Dernière récolte: **14 octobre 2026**.

## Ce qu'il y a dedans

```text
data/
├── README.md                      ce fichier (le plan du dossier)
├── SOURCES.csv                    la liste de toutes les sources, avec lien et date
├── ecg/                           A. Données officielles (ECG)
│   ├── README.md
│   ├── pdf/ECG_LoadMgt_Schedule_2023.pdf                 le PDF officiel de l'ECG (16 pages)
│   ├── ecg_load_management_2023_zones.csv                toutes les localités de ce PDF (2 310 lignes)
│   ├── ecg_horaires_2023.csv                             quel groupe est coupé quel jour (9 lignes)
│   ├── zones_pilotes_vs_groupes_2023.csv                 nos 10 quartiers pilotes face aux groupes ECG
│   ├── ecg_delestage_2026_avril.csv                      les 4 blocs de 6 heures de 2026
│   ├── 3news_groupes_2026.csv                            groupe ECG (A, B, C) de chaque localité d'Accra et Tema, avril 2026
│   └── ecg_pannes_planifiees_2026.csv                    coupures planifiées de juin et octobre 2026 (actuelles)
├── x/                             données récupérées sur X (annonces ECG du 8 au 14 octobre 2026)
├── prompts/                       les prompts pour les agents IA (X et Meta/Facebook)
├── nline/                         C. Données historiques des capteurs
│   └── README.md                  comment accéder au jeu de données GridWatch Accra
└── recherche/                     C. Études qui expliquent les coupures à Accra
    ├── README.md
    └── pdf/                       deux articles scientifiques
```

## Le plus important à retenir

1. **Les groupes ECG sont A, B, C et D** (pas seulement A, B, C). Le calendrier de 2023 coupe un groupe par soir, de 18h à 23h. Le délestage d'avril 2026 utilise A, B et C, par blocs de 6 heures.
2. **Un quartier n'est pas dans un seul groupe.** Dansoman a des parties dans B, C et D. Airport Residential est dans A, C et D. Le lien entre quartier et groupe est donc de type « plusieurs à plusieurs ». Le modèle de base de données doit en tenir compte (voir [docs/MODELISATION_BASE_DE_DONNEES.md](../docs/MODELISATION_BASE_DE_DONNEES.md)).
3. **Données actuelles (octobre 2026):** l'ECG publie des coupures planifiées presque chaque semaine, de 9h à 17h. Le détail des quartiers est souvent dans **des images sur X**, que la presse ne recopie pas. C'est pourquoi `prompts/PROMPT_AGENT_X.md` demande à un agent de les récupérer. Seul Accra West (12 au 16 octobre) est complet pour l'instant.
4. **Les capteurs nLine montrent que l'ECG sous-déclare ses coupures** (de près de 100 % selon les chercheurs). Les signalements des habitants sont donc utiles.
5. **Le jeu de données GridWatch Accra existe et est public**, mais il se télécharge via un tableau de bord, pas via un fichier direct. Voir [nline/README.md](nline/README.md).

## Limites et précautions

- Le dépôt GitHub est **public**. Les deux PDF de recherche appartiennent à leurs auteurs; ils sont là pour lecture interne. Avant la soumission finale, **les retirer du dépôt** ou garder seulement le lien (voir [recherche/README.md](recherche/README.md)).
- Les fichiers CSV sont **extraits automatiquement** du PDF. Ils contiennent quelques erreurs de coupure de mots. À relire avant d'importer en base.
- Respecter les règles des sites (`robots.txt`, conditions d'utilisation) pour tout script qui récupère des horaires (tâche 65).
