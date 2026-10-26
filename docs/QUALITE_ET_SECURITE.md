# Qualité, performances et sécurité

Tâches 102, 122 et 129 à 133. Mesures faites le 21 octobre 2026 sur un MacBook Apple M3 et sur le projet Supabase hébergé. Pour relancer chaque mesure, voir la colonne « Commande ».

## Performances

| Mesure | Résultat | Limite visée | Commande |
|---|---|---|---|
| Calcul des 10 prévisions (122) | 32 ms | 2 s | test `Speed`, `python3 -m unittest discover -s prediction/tests` |
| Lecture de l'état des quartiers et des prévisions par l'app (122) | 170 ms | 2 s | `npm run test:live` (backend) |
| 100 signalements d'un coup, avec les contrôles de chaque signalement (131) | 11 ms | 2 s | `npm run test:load` (backend, projet relié) |
| Lecture de la carte juste après ces 100 signalements (131) | moins de 1 ms | 0,5 s | idem |
| Site web en 3G lente, 400 kbit/s et 400 ms de latence (129) | contenu visible en 0,6 s, page complète en 15,6 s | | navigateur avec réseau simulé |
| Site web en 3G rapide (129) | contenu visible en 0,2 s, page complète en 4,4 s | | idem |

**Limites de ces mesures** : le test de charge envoie les 100 signalements depuis la base elle-même (marqués simulés, puis supprimés par leur identifiant : un vrai signalement portant le même texte n'est jamais touché, vérifié par `test:sql`) ; il ne simule pas 100 téléphones sur le réseau. Les signalements simulés ne déclenchent pas d'alerte.

## Sans réseau et réseau lent (129)

| Situation | Comportement | Vérifié par |
|---|---|---|
| Mobile sans réseau | Le signalement est gardé sur le téléphone avec son heure d'observation et un identifiant unique, puis envoyé au retour du réseau ; jamais en double | Tests de la file (`mobile/src/lib/report-queue.test.ts`), `test:sql` |
| Web sans réseau | Fond de carte absent mais quartiers et signalement utilisables ; message clair si l'envoi échoue | Parcours navigateur « offline tiles… » |
| Base injoignable | Badge « HORS LIGNE », quartiers en « État inconnu », jamais d'état inventé | Vérifié dans un navigateur |

## Poids et données (130)

| Mesure | Résultat |
|---|---|
| Code de l'app Android compilé (Hermes) | 5,8 Mo |
| Images et polices embarquées | 2,0 Mo |
| Site web, première visite | 391 Ko transférés |
| Données par rafraîchissement en mode connecté (état, horaires ECG, prévisions, offres) | 3,4 Ko compressés, soit environ 200 Ko par heure d'utilisation continue (rafraîchissement chaque minute) |

Le poids de l'APK final n'est pas encore mesuré : il ajoute le moteur natif de React Native et demande une compilation EAS (compte Expo).

## Secrets (132)

- Recherche sur **tout l'historique Git** (67 commits, toutes les branches) : **aucun** fichier `.env`, clé secrète Supabase, jeton, mot de passe de base ou clé privée.
- `web/.env.local`, `mobile/.env` et `backend/supabase/.temp/` sont ignorés par Git.
- Les apps n'utilisent que la clé **publique** (publishable). Le mot de passe de la base n'existe que dans les secrets GitHub (`SUPABASE_DB_URL`).
- Le CI lance gitleaks sur tout l'historique à chaque pull request.

## Failles des dépendances (133)

`npm audit` relancé le **26 octobre 2026** (le premier passage, du 21 octobre, est dépassé) :

| Projet | Résultat | Dans ce qui est livré ? |
|---|---|---|
| Backend | 0 faille | — |
| Web | 0 faille | Le 26 octobre au matin, l'audit signalait `next` 16.3.8 comme **critique** dans les dépendances de production. `main` est passé à `next` 16.4.1 (PR Dependabot #14) : l'audit ne signale plus rien. Avant cette mise à jour, nous n'avions pas démontré d'exploitation dans LightLink : le lockfile contenait déjà `sharp` 0.35.5, mesure prévue par l'avis de Next.js sur les images, et le code n'utilise ni `use cache` ni les Server Actions visés par les autres avis |
| Mobile | 7 alertes, issues de **2 failles** | Voir ci-dessous |

Corrigé le 26 octobre : `zod` (mémoire épuisée en validant une très grande collection), utilisé par l'outil en ligne de commande d'Expo et par ESLint, est forcé en 4.6.7 (`overrides` dans `mobile/package.json`). Vérifié : lint, types, tests, compatibilité Expo, export Android, iOS et web, 37 parcours navigateur, démarrage du serveur Expo et validation des extensions par `@expo/cli`.

Les 2 failles restantes :

| Paquet | Faille | Où il sert | Décision |
|---|---|---|---|
| `node-forge` 1.4.0 (4 alertes) | Vérification de signature RSA trop permissive | Outil Expo de signature des mises à jour (`@expo/cli`), sur l'ordinateur ; absent de l'app installée | **Aucune version corrigée publiée** (1.4.0 est la dernière). LightLink n'utilise pas les mises à jour signées |
| `decode-uri-component` 0.2.2 (modérée, 3 alertes via `query-string` 7) | Blocage par un lien mal encodé | Lecture des liens par `expo-router`, **dans l'app** | Risque faible (un lien piégé ferait au pire planter l'app chez celui qui l'ouvre). Essayé : forcer `query-string` 9.5.1 (corrigé) casse l'app, car cette version n'existe qu'en module ESM et Metro la charge mal (`stringify is not a function` dans 3 parcours). La vraie correction est expo-router 58, donc le SDK Expo 58 : à faire après la soumission |

Les « corrections » proposées par `npm audit` (Expo 44) sont des **retours en arrière** de plusieurs années : à ne pas appliquer. Nous ne disons donc pas « zéro faille » : le web et le backend n'en ont aucune connue ; le mobile en garde une modérée dans l'app et une dans les outils de l'ordinateur, faute de version corrigée compatible.

## Sécurité et vie privée (102)

Vérifié par `npm run test:sql` avec les vrais rôles de Supabase, et par `npm run test:live` sur le projet hébergé :

- Personne ne signale au nom d'un autre, ni sans session ; 5 signalements au plus en 10 minutes ; une position à plus de 5 km du quartier est refusée.
- L'heure d'un signalement (`created_at`) est fixée par la base pour les apps : une date antidatée ne permet plus de contourner la limite de 5 signalements (corrigé par la migration du 26 octobre, après la relecture de PAN sur la #10 ; auparavant, ce contournement était possible).
- Personne ne modifie les données d'un autre (signalements, profils, offres) ; seuls l'import et le script de démo écrivent les horaires, prévisions et signalements simulés.
- L'adresse exacte d'une offre n'est visible que par l'hôte et les demandeurs acceptés ; les demandes, les profils et les notifications sont privés.
- Les signalements d'abus ne sont lisibles que par l'équipe.
- Personne, avec ou sans compte, ne lit par l'API **l'identifiant de compte** de l'hôte d'une offre (`host_id`) ni de l'auteur d'un signalement (`user_id`), ni dans les événements Realtime. Auparavant, les offres publiques montraient le nom saisi par l'hôte **et** son identifiant, ce qui permettait de retrouver tous ses signalements (quartiers, heures). L'app retrouve ses propres offres par `my_offers()`. Corrigé par la migration 13 du 26 octobre (`20261026000100_hide_account_ids.sql`), vérifié par `test:sql` avec les droits que Supabase donne à ses rôles. **Appliquée au projet hébergé le 26 octobre** et vérifiée en ligne : `npm run test:live` passe (partage complet, `my_offers()`, colonnes refusées), et un visiteur sans compte reçoit toujours l'événement Realtime d'un nouveau signalement, sans `user_id`.
- La position GPS d'un signalement sert seulement à vérifier qu'il vient du quartier, puis **n'est pas conservée** ; les positions enregistrées avant ont été effacées. Auparavant, la table des signalements étant publique, n'importe qui pouvait lire ces coordonnées par l'API, même sans compte : défaut corrigé par la migration du 26 octobre, après la relecture de PAN sur la #10.

La migration du 26 octobre est testée sur une base locale (`test:sql`) et **appliquée au projet hébergé le 26 octobre**. Vérifié en ligne par l'API : un signalement envoyé avec `created_at` au 1er janvier est enregistré à l'heure du serveur, et un visiteur sans compte lit `lat` et `lng` vides. Rejoué en ligne avec Realtime : le visiteur sans compte reçoit toujours l'événement du nouveau signalement (la carte se met à jour), sans position et avec l'heure du serveur ; `npm run test:live` passe aussi après la migration.
