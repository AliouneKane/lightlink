# LightLink : la base de données expliquée simplement

Date: 14 octobre 2026. Ce document explique le projet, puis la base de données, pour quelqu'un qui n'a jamais travaillé sur LightLink. Aucune connaissance technique n'est nécessaire pour la partie 1 à 3.

**Où en est ce document ?** C'est une **proposition**. Oscar (responsable des données) et Salam (chef de projet) doivent la valider. Les tâches du plan concernées sont la 31 (dessiner la base) et la 32 (dessiner l'architecture).

---

## 1. Le projet en 2 minutes

**LightLink** est une application (téléphone et site web) pour le **Tech Hub Africa Hackathon 2026**, dans la catégorie *Electricity Efficiency*. La date limite de soumission prévue dans notre plan est le **31 octobre 2026**.

**Le problème.** Au Ghana, le courant coupe souvent. On appelle ça le **dumsor**. Souvent, seul **un quartier** est dans le noir pendant que le quartier d'à côté a de la lumière. Les commerçants perdent de l'argent, les étudiants ne peuvent plus travailler, et les gens ne savent pas où aller.

**La solution.** L'application fait trois choses:

1. **Informer**: voir sur une carte quels quartiers ont du courant, grâce aux signalements des habitants et aux horaires officiels.
2. **Prévoir**: dire à l'avance « coupure probable dans ton quartier entre 18h30 et 22h, confiance 82 % ».
3. **Aider**: mettre en relation quelqu'un qui a un surplus d'énergie (générateur, panneau solaire, batterie) avec ses voisins qui en ont besoin.

**Trois exemples de personnes** (elles apparaissent dans l'application):

- **Amadou**, étudiant à Madina. Il reçoit une alerte avant la coupure et charge son ordinateur à temps.
- **Ama**, coiffeuse. Elle sait qu'une coupure de 4 heures est probable et cherche une source d'énergie proche.
- **Kwame**, propriétaire d'un générateur. Il propose son surplus et les voisins viennent recharger contre une petite contribution.

## 2. Où en est le projet

| Partie | État au 14 octobre |
|---|---|
| Site web (Next.js) | Prototype fini, **avec de fausses données** |
| Application mobile (React Native avec Expo) | Prototype fini, **avec de fausses données** |
| Base de données (Supabase) | Mise en place de départ faite, **pas encore branchée** aux écrans |
| Prédiction | Pas commencée |

Aujourd'hui, les écrans affichent des données inventées, rangées dans le fichier `shared/energy.ts`. **Le travail à venir** est de remplacer ces fausses données par de vraies, stockées dans la base de données. C'est le rôle de ce document.

**L'équipe**: Salam (chef de projet, branchement du front au back), PAN (écrans web et mobile), Oscar (données et prédiction), Rama (produit, textes, vidéo). Le détail est dans `LightLink_Repartition_des_taches_v2.md` à la racine du dépôt.

## 3. C'est quoi une base de données ?

Imaginez un **classeur Excel avec plusieurs feuilles**.

- Une **table** = une feuille. Exemple: la table `zones` liste les quartiers.
- Une **ligne** = une entrée. Exemple: la ligne « Madina ».
- Une **colonne** = une information. Exemple: le nom, la latitude.
- Un **lien** entre deux tables: une ligne d'une feuille renvoie à une ligne d'une autre. Exemple: un signalement contient le nom du quartier concerné, qui renvoie à la table `zones`.
- Une **vue** = une feuille **calculée automatiquement** à partir des autres. On ne la remplit jamais à la main.
- Une **règle d'accès** (on dit aussi **RLS**) = qui a le droit de lire ou d'écrire quoi. Exemple: tout le monde peut lire les quartiers, mais seul le propriétaire d'un profil peut le modifier. C'est ce qui empêche un utilisateur de toucher aux données d'un autre.

**Supabase** est le service qui héberge cette base. Il gère aussi les **comptes** (inscription, connexion) et le **temps réel** (la carte se met à jour sans recharger la page). On l'a choisi avec Oscar, voir [DECISION_SUPABASE.md](DECISION_SUPABASE.md).

### Quelques mots utiles

| Mot | Sens simple |
|---|---|
| **ECG** | Electricity Company of Ghana, la société d'électricité. Elle publie des horaires de coupures prévues |
| **Dumsor** | Les coupures de courant au Ghana |
| **Délestage** | Coupures organisées par l'ECG, quartier par quartier, à tour de rôle |
| **Groupes A, B, C** | Les quartiers sont rangés par groupe. Chaque groupe est coupé à son tour |
| **Zone** | Un quartier de départ (nous en avons 10) |
| **Feeder** | Le câble qui alimente un secteur. On l'ignore dans la v1 (voir les questions à la fin) |
| **Signalement** | Un habitant dit « il n'y a plus de courant » ou « le courant est revenu » |
| **Offre** | Quelqu'un propose son énergie en surplus |
| **Demande** (`booking`) | Quelqu'un demande à profiter d'une offre |
| **Prototype / simulé** | Ça marche à l'écran, mais avec de fausses données |

## 4. Ce que la base doit retenir (vue d'ensemble)

Chaque phrase ci-dessous correspond à une table.

1. **Les quartiers** existent et ont une position sur la carte. → `zones`
2. **Les gens** ont un compte et un profil (nom, quartier). → `profiles`
3. **Les gens signalent** coupure ou retour du courant. → `outage_reports`
4. **L'ECG publie** des horaires de coupure. → `ecg_schedules`, rangés par groupe dans `ecg_groups`
5. **Chaque quartier a un état** (courant OK, coupure probable, coupure confirmée), calculé à partir des signalements. → vue `zone_status`
6. **Le système prédit** les coupures à venir. → `predictions`
7. **Les gens proposent de l'énergie.** → `offers`
8. **Les gens demandent de l'énergie.** → `bookings`
9. **Les gens reçoivent des alertes.** → `notification_preferences` et `push_tokens`

### Schéma: qui est relié à qui

```text
                    ┌──────────────┐
                    │ ecg_groups   │  (groupes A, B, C)
                    └───┬──────┬───┘
                        │      │
                        ▼      ▼
┌────────────┐     ┌────────┐   ┌───────────────┐
│ profiles   │────▶│ zones  │◀──│ ecg_schedules │  horaires officiels
│ (comptes)  │     │(quartiers)  └───────────────┘
└─────┬──────┘     └─┬──┬──┬─┘
      │              │  │  │
      │              │  │  └────────▶ predictions   (prévisions)
      │              │  └───────────▶ offers        (énergie proposée) ──▶ bookings (demandes)
      ▼              ▼
 outage_reports  (signalements: qui, où, quand, coupure ou retour)
      │
      ▼
 zone_status  (vue: état de chaque quartier, calculé)
```

Lecture: une flèche « A → B » veut dire « A pointe vers B ». Par exemple, un signalement pointe vers un quartier et vers la personne qui l'a fait.

**Les deux sources d'information sont séparées exprès.** Les horaires de l'ECG disent *ce qui est prévu*. Les signalements disent *ce qui se passe vraiment*. En les comparant, l'application peut afficher « coupure prévue » ou « coupure surprise » (tâche 68).

## 5. Les règles de départ

- Un quartier = une **zone**. Nous en avons **10 pilotes**: Osu, Labone, East Legon, Adabraka, Cantonments, Dansoman, Airport Residential, Achimota, Madina et Tema Community 1. Leurs identifiants sont les mêmes que dans les écrans (`osu`, `madina`, etc.), donc le branchement est simple.
- Les offres montrent **le centre du quartier**, jamais l'adresse de la personne. C'est un choix de sécurité déjà présent dans le prototype.
- Les écrans (web et mobile) utilisent **seulement la clé publique** (`anon`). Une clé secrète (`service_role`) existe, mais elle reste **hors des applications**. Seuls nos scripts (import des horaires ECG, prédiction) l'utilisent.
- Aucun secret n'est écrit dans le dépôt, car il est public. Les clés vont dans un fichier `.env` qui n'est jamais envoyé sur GitHub.

---

## 6. Les tables en détail

Légende: **Existe** = déjà créée dans [la migration](../backend/supabase/migrations/20261014000000_init_phase2.sql). **Proposé** = pas encore créée.

### 6.1 Phase 2 (à faire en premier): signalement, carte, horaires

#### `zones`: les quartiers (Existe)

À quoi ça sert: la liste des quartiers pilotes, avec leur position sur la carte.

| Colonne | Ce que c'est |
|---|---|
| `id` | Un nom court unique, par exemple `madina` |
| `name` | Le nom affiché, « Madina » |
| `lat`, `lng` | La position du centre du quartier sur la carte |
| `created_at` | La date de création |

Qui a le droit: tout le monde lit. Personne n'écrit depuis les applications.

#### `profiles`: le profil de chaque personne (Existe)

À quoi ça sert: retenir le nom et le quartier de chaque personne. Il est créé **automatiquement** quand quelqu'un s'inscrit.

| Colonne | Ce que c'est |
|---|---|
| `id` | Le même numéro que le compte de la personne |
| `display_name` | Son nom affiché (60 lettres au maximum) |
| `zone_id` | Son quartier (renvoie à `zones`) |
| `created_at` | La date de création |

Qui a le droit: chacun lit et modifie **seulement son propre** profil.

#### `outage_reports`: les signalements (Existe)

À quoi ça sert: chaque fois qu'une personne appuie sur « Signaler », une ligne est ajoutée. C'est la matière première de la carte et, plus tard, de la prédiction.

| Colonne | Ce que c'est |
|---|---|
| `id` | Un numéro unique |
| `zone_id` | Le quartier concerné |
| `user_id` | La personne qui signale (rempli automatiquement) |
| `kind` | `outage` = coupure, `restored` = courant revenu |
| `description` | Un petit texte facultatif (280 lettres au maximum) |
| `lat`, `lng` | La position du téléphone, facultative |
| `created_at` | L'heure du signalement |

Qui a le droit: tout le monde lit (pour la carte). Chacun ajoute **seulement en son nom**.

**Protection contre les abus** (tâche 53): une personne ne peut pas faire plus de **5 signalements en 10 minutes**. Le 6e est refusé.

#### `ecg_groups`: les groupes de délestage (Proposé)

À quoi ça sert: l'ECG range les quartiers en groupes (A, B, C…). Il suffit de savoir à quel groupe appartient un quartier pour deviner son tour de coupure.

| Colonne | Ce que c'est |
|---|---|
| `id` | `A`, `B`, `C`… |
| `label` | Le nom affiché |

**Attention, découverte dans [data/](../data/README.md):** un quartier n'est pas dans un seul groupe. Dans le PDF de l'ECG de 2023, Dansoman a des parties dans les groupes B, C et D, et Airport Residential dans A, C et D. Il y a aussi un groupe D, pas seulement A, B, C. On ne met donc **pas** de colonne `group_id` dans `zones`. On ajoute une petite table de liaison `zone_groups` (une ligne par couple quartier + groupe), avec une colonne `partielle` (oui si seule une partie du quartier est concernée). Les données de départ sont dans `data/ecg/zones_pilotes_vs_groupes_2023.csv`.

#### `ecg_schedules`: les horaires officiels de l'ECG (Existe)

À quoi ça sert: stocker « tel quartier sera coupé de telle heure à telle heure ». Rama les saisit à la main au début, puis le script d'Oscar les récupère automatiquement (tâches 62 à 66).

| Colonne | Ce que c'est |
|---|---|
| `id` | Un numéro unique |
| `zone_id` | Le quartier concerné |
| `group_id` | Le groupe (**à ajouter**, aujourd'hui c'est un simple texte `group_name`) |
| `starts_at`, `ends_at` | Début et fin de la coupure (la fin doit être après le début) |
| `kind` | `planned` = prévue, `emergency` = urgence |
| `source_url` | Le lien de la publication de l'ECG (pour prouver d'où ça vient) |
| `created_at` | La date d'ajout |

Deux **ajouts proposés**:

- Une règle « **pas de doublon** » sur (quartier, début, fin). Elle permet de relancer le script chaque jour sans remplir deux fois la même ligne.
- Une colonne `source` (`manual` ou `script`) pour savoir si la ligne vient de Rama ou du script.

Qui a le droit: tout le monde lit. Seuls nos scripts écrivent (avec la clé secrète).

#### `zone_status`: l'état de chaque quartier (vue, Existe)

À quoi ça sert: c'est ce que la **carte** colore. On ne la remplit jamais. Elle regarde les signalements des **2 dernières heures** et donne un état à chaque quartier:

| État | Quand |
|---|---|
| `confirmed_outage` (coupure confirmée) | 3 signalements de coupure ou plus, et plus de coupures que de retours |
| `probable_outage` (coupure probable) | Plus de coupures que de retours, mais moins de 3 |
| `powered` (courant OK) | Tous les autres cas |

**Évolution proposée**: ajouter une colonne `planned_now` qui dit si un horaire de l'ECG couvre l'heure actuelle. L'écran pourra alors afficher « coupure prévue » ou « surprise ».

### 6.2 Phases 3 et 4 (après le feu vert): prédiction et partage d'énergie

#### `predictions`: les prévisions (Proposé)

À quoi ça sert: c'est ce qu'affiche l'écran « Prévisions », par exemple « 78 % de risque vers 18 h, fenêtre 18:00 à 20:30 ». Le script d'Oscar écrit dedans.

| Colonne | Ce que c'est |
|---|---|
| `id` | Un numéro unique |
| `zone_id` | Le quartier concerné |
| `generated_at` | Quand la prévision a été calculée |
| `window_start`, `window_end` | La période où la coupure est probable |
| `probability` | Le risque, de 0 à 100 |
| `confidence` | La confiance dans la prévision, de 0 à 100 (affichée à l'utilisateur) |
| `expected_duration_min` | La durée estimée, en minutes |
| `method` | `rules` = règles simples (version 1), `random_forest` = modèle d'apprentissage (bonus, tâche 114) |
| `model_version` | Le nom de la version qui a calculé, pour s'y retrouver |

Qui a le droit: tout le monde lit. Seuls nos scripts écrivent.

#### `offers`: l'énergie proposée (Proposé)

À quoi ça sert: Kwame publie « j'ai un générateur disponible ». Les champs reprennent ceux du prototype.

| Colonne | Ce que c'est |
|---|---|
| `id` | Un numéro unique |
| `host_id` | Celui qui propose (rempli automatiquement) |
| `zone_id` | Son quartier (jamais l'adresse) |
| `source` | `solar`, `generator` ou `battery` |
| `title`, `description` | Le titre et le texte |
| `capacity_label` | Une indication comme « 2 kW » |
| `suggested_price_ghs` | La contribution conseillée en cedis (**aucun paiement n'a lieu dans l'application**) |
| `slots` | Le nombre de places |
| `available_until` | Jusqu'à quand l'offre est valable |
| `status` | `active` ou `suspended` (suspendue depuis « Mes offres ») |
| `created_at` | La date de publication |

Qui a le droit: tout le monde voit les offres actives. Seul l'auteur crée et modifie son offre.

#### `bookings`: les demandes d'énergie (Proposé)

À quoi ça sert: Amadou demande à profiter de l'offre de Kwame.

| Colonne | Ce que c'est |
|---|---|
| `id` | Un numéro unique |
| `offer_id` | L'offre demandée |
| `requester_id` | Celui qui demande (rempli automatiquement) |
| `status` | `pending` = en attente, `accepted` = acceptée, `declined` = refusée, `cancelled` = annulée, `completed` = terminée |
| `created_at` | La date de la demande |

Règles:

- On ne peut pas demander sa propre offre.
- Une demande **en attente** ne prend pas de place. La place est prise quand l'hôte **accepte** (c'est déjà ainsi dans le prototype).
- Qui voit quoi: le demandeur et l'hôte de l'offre. Le demandeur crée et annule. L'hôte accepte ou refuse.

#### `notification_preferences` et `push_tokens`: les alertes (Proposé)

À quoi ça sert: décider qui reçoit quelles alertes, et sur quel téléphone les envoyer (Firebase Cloud Messaging sert seulement à l'envoi).

| Table | Colonnes principales |
|---|---|
| `notification_preferences` | La personne, et trois cases: alertes de coupure, alertes de prévision, alertes d'offres |
| `push_tokens` | La personne, l'adresse du téléphone (unique), la plateforme (`android`, `ios`, `web`), la date |

Qui a le droit: chacun lit et modifie **seulement ses propres** lignes.

---

## 7. Dans quel ordre on le construit

| Étape | Quoi | Tâches du plan |
|---|---|---|
| 1. **Maintenant** | Valider `zones`, `profiles`, `outage_reports`, `ecg_schedules`, `zone_status`. Ajouter `ecg_groups`, `zone_groups`, `group_id` (dans les horaires) et la règle « pas de doublon » dans une **deuxième migration** | 31, 35, 50, 51, 63 |
| 2. Avec le signalement réel | Brancher les écrans sur `outage_reports` et `zone_status`. Le temps réel est déjà activé sur `outage_reports` | 52 à 60 |
| 3. Après le point du 21 octobre | `predictions`. Puis `offers` et `bookings` **si** on veut un vrai partage d'énergie. Sinon il reste simulé dans la v1 | phases 3 et 4 |
| 4. Seulement s'il reste du temps | `notification_preferences` et `push_tokens` | phase 3 |

Une **migration** est un fichier qui modifie la base de façon propre et répétable. Elles sont dans `backend/supabase/migrations/`.

## 8. Comment vérifier que c'est sûr (tâche 73)

Ce sont les tests à écrire pour être sûr que personne ne triche:

- Une personne ne peut pas créer un signalement **au nom d'une autre**.
- Une personne ne peut pas lire ni modifier le **profil d'une autre**.
- Une personne ne peut pas écrire dans `ecg_schedules` ni dans `predictions`.
- Le **6e signalement en 10 minutes** est refusé.
- Un hôte ne peut pas modifier **l'offre d'un autre** (quand `offers` existera).

## 9. Questions à trancher avec Oscar

1. **Garde-t-on les feeders ?** Le projet en parle, mais aucune source publique ne donne les feeders par quartier. **Je propose de les ignorer dans la v1.**
2. **Garde-t-on les anciens signalements ?** L'état d'un quartier n'utilise que 2 heures, mais l'historique servira à la prédiction. **Je propose de tout garder.**
3. **Garde-t-on la position exacte d'un signalement ?** **Je propose de la garder facultative et de ne jamais la montrer aux autres utilisateurs.**

## 10. Où trouver quoi dans le dépôt

| Je cherche | Fichier |
|---|---|
| Les tables déjà créées | `backend/supabase/migrations/20261014000000_init_phase2.sql` |
| Les 10 quartiers de départ | `backend/supabase/seed.sql` |
| Comment lancer la base chez soi | `backend/README.md` |
| Pourquoi Supabase | `docs/DECISION_SUPABASE.md` |
| Les fausses données actuelles des écrans | `shared/energy.ts` |
| Qui fait quoi, et les dates | `LightLink_Repartition_des_taches_v2.md` |
| Les variables à remplir (clés) | `.env.example` |
