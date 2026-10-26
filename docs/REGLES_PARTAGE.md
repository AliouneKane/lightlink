# Règles du partage d'énergie

Tâche 78 (Rama et Salam). Ces règles sont appliquées par la base de données (migration `20261022000000_energy_sharing.sql`) et testées par `npm run test:sql` dans `backend/`. **À valider en équipe** : chaque valeur se change en une ligne.

## Une offre

| Règle | Valeur | Pourquoi |
|---|---|---|
| Sources | Solaire, générateur, batterie | Les trois profils de LightLink |
| Durée maximale | 12 heures | Une offre correspond à une coupure, pas à un service permanent |
| Places | 1 à 50 | Nombre de personnes servies en même temps |
| Contribution conseillée | 0 à 1 000 GHS | Indicative : **LightLink ne collecte aucun paiement** dans la v1 |
| États | **disponible** → **complète** (toutes les places prises) → **terminée** (fermée par l'hôte ou arrivée à son heure de fin) | Une place libérée rend l'offre de nouveau disponible |

## Une demande

| Règle | Valeur |
|---|---|
| Qui peut demander | Tout habitant connecté, sauf l'hôte de l'offre |
| Combien | Une demande par offre, et **3 demandes en attente au plus** par personne |
| Étapes | **en attente** → **acceptée** ou **refusée** (par l'hôte) → **terminée** (par l'hôte ou le demandeur). Le demandeur peut **annuler** tant qu'elle n'est pas terminée |
| Places | L'hôte ne peut pas accepter plus de demandes que de places |

## Recherche

| Règle | Valeur |
|---|---|
| Distance | 10 km autour du centre du quartier de l'habitant, les plus proches d'abord |
| Quartier entièrement coupé | Si le quartier est en « coupure confirmée » (3 signalements ou plus), la recherche s'étend à **25 km** et ajoute les **lieux d'énergie fixes** (points de recharge, solar hubs) |
| Offres proposées | Seulement les offres disponibles et pas encore terminées |

## Vie privée et sécurité

- Une offre ne montre que le **quartier** de l'hôte, jamais son adresse.
- L'**adresse exacte** n'est visible que par l'hôte et par les demandeurs **acceptés**.
- Les demandes ne sont visibles que par le demandeur et l'hôte.
- Chacun peut **signaler un abus** (offre ou signalement) ; seule l'équipe lit ces signalements.
