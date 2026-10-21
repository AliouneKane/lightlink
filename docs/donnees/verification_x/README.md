# Vérification par sources officielles (16-17 octobre 2026)

Tableaux collectés par un agent IA avec accès à X, limité aux comptes officiels (ECG, GRIDCo) et aux médias. Il n'a pas le droit de citer des posts de particuliers: **aucun témoignage d'habitant**. Ces fichiers ne suivent pas le format à 16 colonnes de `data/` et ne servent pas aux taux du modèle.

| Fichier | Lignes | Contenu |
|---|---|---|
| **`evenements_verifies.csv`** | 4 | **Fichier de référence**: un événement par ligne, vérifié, dédoublonné, avec ses sources |
| `verification_annonces.csv` | 11 | Brut agent: annonces ECG du 5 au 16 octobre 2026 et recherche d'un suivi officiel |
| `retablissements_causes.csv` | 5 | Brut agent: début, retour et cause de 3 pannes (contient des doublons et une erreur, voir plus bas) |
| `delestage_et_pannes.csv` | 2 | Brut agent: pannes nationales du 29 juillet et du 20 août 2026 |

Les fichiers bruts sont gardés tels que l'agent les a rendus, pour la traçabilité. **Utiliser `evenements_verifies.csv`.**

## Règle de vérification

Un fait n'entre dans `evenements_verifies.csv` que s'il est recoupé par une **source lisible ouverte à la main** (article de presse citant l'ECG ou GRIDCo). Les posts X ne sont pas lisibles automatiquement (l'API oEmbed de X est devenue payante): leur **date de publication** est vérifiée en la décodant depuis l'identifiant du post (horodatage « snowflake »), leur texte n'est pas utilisé seul.

| Post X | Publié (décodé) | Cohérence |
|---|---|---|
| GRIDCo, Mallam | 2026-10-14 08:35 UTC | Après l'incident de 02:36: bilan, cohérent |
| ECG, panne Tema | 2026-10-14 20:27 UTC | Date annoncée |
| ECG, Accra East du 9 octobre | 2026-10-04 15:18 UTC | Même lot que les annonces du 4 octobre |
| ECG, Achimota 2025 | 2025-05-04 13:04 UTC | Identique à notre CSV, et **avant** le retour réel de 13:20 |

## Corrections apportées aux fichiers bruts

| Problème | Correction | Source |
|---|---|---|
| « Lapaz, Mallam, Awoshie, Anyaa » (Mallam) absent de l'article GNA | Gardés: Lapaz, Mallam, Awoshie. **Anyaa retiré**: dans aucune source | MyJoyOnline, 14/10/2026 |
| 29 juillet: « at dawn » attribué à Graphic, sans heure | **03:11**, heure donnée par GRIDCo | GNA, 29/07/2026 (« about 0311 hours ») |
| Mallam et 20 août en double (deux sources chacun) | Une ligne par événement, sources listées ensemble | |
| Achimota: « 1:20 » sans am/pm | Lu **13:20**: l'explosion a eu lieu à 10:35 | Citi Newsroom, 04/05/2025 |

## Ce que ces fichiers montrent

1. **Aucune annonce n'a de suivi officiel** (11 sur 11 en `aucune_info`). On ne peut ni confirmer ni infirmer que les annonces sont tenues: l'ECG ne publie presque jamais d'annulation. Cette fiabilité sera **mesurée par l'application** (voir [prediction/README.md](../../../prediction/README.md)).
2. **La couverture est maigre**: 11 annonces sur 12 jours, alors que la demande portait sur juillet à octobre. Les annonces Instagram d'Accra East du 10 au 16 octobre manquent: l'agent ne lit que X et la presse.
3. **Trois des quatre grosses pannes commencent la nuit** (02:36, 03:11, 04:30; la quatrième à 10:35). Test exact sous un profil plat: probabilité 0,051 d'en voir au moins trois entre 00h et 06h. Ce sont surtout des incidents du réseau de transport, traités à part dans le modèle.
4. **Les heures de retour annoncées par l'ECG sont des prévisions**: Achimota, 14:00 annoncé, 13:20 réel.

## Ce qui reste introuvable

- **Calendrier de délestage 2026** (heures de chaque bloc, ordre de rotation): aucune trace de délestage entre juillet et octobre 2026. Le modèle lira le prochain calendrier daté dès qu'il sera dans `data/`.
- **Groupe 2026 de Tema Community 1**: absent de l'outil 3news (vérifié le 17 octobre 2026: page `comm-1` inexistante). En 2023, le PDF de l'ECG le place en groupe D (« Comm. 1 Market », « Presby Church Comm. 1 Casino »).
