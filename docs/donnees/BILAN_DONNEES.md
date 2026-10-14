# Bilan: quelle quantité de données avons-nous ?

Au 14 octobre 2026. Tout est dans [data/](../../data/), au même format de 16 colonnes ([README](README.md)).

## En chiffres

| Source | Fichiers | Lignes | Période | Ce que c'est |
|---|---|---|---|---|
| `ecg_pdf/` | 1 | 5 171 | 30 mars au 7 avril 2023 | Délestage officiel, 4 groupes, 2 068 localités |
| `3news/` | 1 | 1 136 | avril 2026 | Groupe A, B ou C de chaque localité (Grand Accra et Tema), sans heures |
| `presse/` | 2 | 186 | 2025 et 2026 | Annonces de l'ECG reprises par la presse |
| `x/` | 2 | 142 | mars-mai 2025, octobre 2026 | Publications @ECGghOfficial |
| `instagram/` | 1 | 79 | 5 au 16 octobre 2026 | Coupures planifiées d'Accra East |
| **Total** | **7** | **6 714** | | |

Poids total: 1,3 Mo. Environ **2 900 localités différentes** (le même lieu peut s'écrire de plusieurs façons).

## Ce qui est vraiment « actuel »

Seules **407 lignes** (les 3 dernières sources, sans les 2 gros fichiers) sont de **vraies annonces de coupures datées**:

- **21 jours de coupures différents** seulement, répartis sur 2025 et 2026.
- **361 localités différentes.**
- Par mois: octobre 2026 (193 lignes), mai 2025 (53), octobre 2025 (43), septembre 2025 (42), mai 2026 (39), juin 2026 (26), mars 2025 (11).
- Par type: 316 planifiées, 74 pannes, 17 urgences.
- Par région: Accra East 117, Accra West 95, Tema 91, Greater Accra 32, Central 26, Eastern 20, Volta 9, sans région 17.

## Ce qui manque pour la prédiction

| Besoin | Où on en est |
|---|---|
| **Une heure de retour du courant** (pour estimer des durées) | **20 lignes** seulement, toutes mars et mai 2025 |
| **Heures de début et de fin** | Présentes pour presque toutes les annonces planifiées (9h-17h en général), absentes pour les pannes |
| **Témoignages d'habitants** (signalements) | **0**. Les deux agents n'en ont trouvé aucun |
| **Historique long** (mois ou années) | **Non**: 21 jours de coupures sur 19 mois, avec de grands vides |
| **Mesures indépendantes** (nLine) | Pas téléchargées: accès par un tableau de bord, licence non précisée, à demander à info@nline.io |
| **Calendrier de délestage 2026 avec les heures** | **Non**: 3news donne le groupe mais pas l'heure de chaque rotation |

## Ce que ça permet, honnêtement

- **Oui:** montrer dans la démo des **vraies données** (Madina coupée les 8, 14 et 16 octobre 2026; East Legon le 9 octobre; Achimota et Adabraka lors de l'incendie du poste d'Achimota le 4 mai 2025).
- **Oui:** une prédiction **à base de règles**: groupe de la localité (3news ou PDF 2023) + rotation + jours de maintenance annoncés.
- **Non:** un modèle d'apprentissage (Random Forest, tâche 114). 21 jours de coupures ne suffisent pas pour en entraîner un fiable.

## Pour les 10 quartiers pilotes

| Zone | Groupe 2026 (3news) | Autres traces |
|---|---|---|
| Madina | A | 2023: A et B (partie); octobre 2026: coupures les 8, 14 et 16 |
| East Legon | A | 2023: A; octobre 2026: coupure le 9 |
| Adabraka | A | 2023: A, B, D (parties); mai 2025 (incendie d'Achimota) |
| Labone | B | 2023: A et B (parties) |
| Dansoman | B | 2023: B, C, D (parties); mai 2025 (maintenance de Mallam) |
| Achimota | non trouvé dans 3news | 2023: B, C, D; mai 2025 (incendie d'Achimota) |
| Osu | non trouvé dans 3news | 2023: B, C, D (parties) |
| Cantonments | non trouvé dans 3news | 2023: B et D |
| Airport Residential | non trouvé dans 3news | 2023: A, C, D |
| Tema Community 1 | non trouvé (« Lakeside Community 1 and 8 » en A est un autre lieu) | aucune |

Le groupe de Madina, East Legon, Labone et Dansoman est **cohérent** entre le PDF de 2023 et 3news.

## Qualité: ce qu'il faut savoir

- Les lignes lues dans des **images** (`source_type=image`) ont été lues par une IA: des fautes de nom sont possibles.
- **Les listes sont incomplètes**: beaucoup d'annonces disent « et zones environnantes ».
- **Les régions ne sont pas comparables** entre fichiers (Accra East/West d'un côté, Greater Accra de l'autre).
- **Le fichier 2023 de l'agent Meta a été rejeté** (voir [le README](README.md)).
- Une même coupure peut apparaître dans **plusieurs sources** (par exemple Accra West du 12 au 14 octobre 2026: X et presse). Ne pas additionner sans dédoublonner.

## Pistes pour avoir plus

1. **Relancer les agents** sur 2024 et sur les mois manquants de 2025 et 2026, en demandant explicitement les **posts « supply restored »** (c'est la source des durées).
2. **Demander l'accès nLine** (1 300 capteurs, 4 ans): c'est la vraie source d'historique.
3. **Collecter nous-mêmes** dès que l'application sera en ligne (signalements des habitants).
