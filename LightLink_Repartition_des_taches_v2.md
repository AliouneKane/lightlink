# LightLink - Répartition des tâches (version mise à jour)

Mise à jour du 14 octobre 2026, après la PR #1 (web, mergée le 5 octobre) et la PR #2 (mobile, mergée le 13 octobre) de PAN.
Version initiale: 2 octobre 2026. Équipe: Salam, PAN, Oscar, Rama.

## Ce qui a changé depuis la version du 2 octobre

- PAN a livré le prototype web (PR #1, 5 octobre) et le prototype mobile Expo (PR #2, mergée le 13 octobre). Le front est donc complet en prototype, avec des données simulées.
- Les tâches mobile (26, 27, 28, 33, 38, 41, 54, ainsi que 57 et 61 côté mobile) sont faites en prototype. Elles n'ont pas été testées sur un vrai téléphone (Android/iOS).
- La tâche 29 (validation du front par l'équipe) est toujours en attente. Le prototype complet est prêt à être validé et elle débloque le backend. La date limite du 8 octobre est dépassée.
- Le CI de `main` est rouge sur le job mobile (étape « Expo dependency compatibility »). Les jobs web, prediction et détection de secrets passent.
- Une PR Dependabot (#3) est ouverte sur mobile (`expo-router`, `decode-uri-component`). Son CI échoue aussi.
- Le tableau a maintenant une colonne « État » pour toutes les phases.

Légende: **Fait**, **Partiel**, **En attente**, **À faire**.

## Rôles

| Surnom | Membre | Profil | Rôle dans LightLink | Domaine principal |
|---|---|---|---|---|
| Salam | Alioune Abdou Salam Kane | Polyvalent tech et business, pitch, agents IA | Chef de projet et lead technique | GitHub, intégration front-back, backend, envoi DoraHacks |
| PAN | Papa Amadou Niang | Full stack, très fort en design web | Design et interface | Front end codé directement (mobile React Native, web Next.js), charte visuelle |
| Oscar | Judicael Oscar Kafando | Algorithmes, data, modèles et machine learning | Data et prédiction | Base de données, horaires ECG, regroupement, prédiction, qualité des tests |
| Rama | Ndeye Ramatoulaye Ndoye Fall | Idées, élocution, présentation et design type Canva | Produit et communication | Parcours utilisateurs, README, vidéo démo, visuels, pitch, tests auprès de tiers |

## Règles de répartition

Un responsable par tâche, un relecteur pour chaque pull request, et l'équipe entière seulement quand le plan le demande (validation, démo interne).

- **Responsable**: le surnom dans la colonne « Resp. » fait la tâche. **Tous** = l'équipe. Salam + PAN = binôme.
- **Relecture des PR**: Salam relit PAN et Oscar. PAN relit Salam. Oscar relit Salam sur le code data. Rama fait relire ses fichiers (README, docs) par Salam ou PAN. Personne n'approuve sa propre PR.
- **Salam** est le point de passage de l'intégration (backend, mobile, CI). PAN prend les écrans et composants de l'interface, Oscar la logique data.
- **Rama** ne code pas les écrans. Elle tient le produit, les textes, les visuels, les tests auprès de tiers et la vidéo. Elle peut modifier README et docs directement depuis GitHub, via une PR.
- **Bonus Random Forest** (tâche 114): Oscar, seulement si la v1 de la prédiction est finie et testée.
- **En cas de retard**: on retire d'abord la tâche 114, puis le web devient une version simple. On ne coupe jamais les tests ni la vidéo.

## Ordre de travail: le front d'abord

PAN a demandé que le front soit fait avant le back. Il code directement jusqu'à obtenir un prototype.

- **Front d'abord**: PAN crée le mobile (React Native avec Expo) et le web (Next.js) avec des données factices. **Le web (PR #1) et le mobile (PR #2) sont faits en prototype.**
- **Feu vert backend**: le backend (tâches 35, 36, 37, 40, puis phase 2) démarre après la validation du front par l'équipe (tâche 29). **Cette validation est la prochaine étape bloquante et n'a pas encore eu lieu.**
- **Pendant l'attente**: Salam et Oscar préparent ce qui ne dépend pas du front (comptes, architecture, schéma de la base sur papier, collecte et script des horaires ECG). Rama prépare les parcours et les tests.
- **Stack mobile**: React Native remplace Flutter. Le CI et le README du dossier mobile ont été mis à jour dans la PR #2.

## Phase 0: préparer l'équipe (prévue du 1 au 3 octobre, reste à finir avant le 16 octobre)

| N° | Tâche | Resp. | État |
|---|---|---|---|
| 1 | S'inscrire sur DoraHacks avec Register (tous les membres) | Tous | **Fait** pour Salam, PAN et Oscar. Il ne reste que Rama (identifiant DoraHacks à fournir) |
| 2 | Vérifier que chaque membre a entre 15 et 25 ans | Salam | Fait |
| 3 | Confirmer le track Electricity Efficiency | Salam | Fait |
| 4 | Créer le dépôt GitHub public lightlink | Salam | Fait |
| 5 | Ajouter tous les membres au dépôt | Salam | Fait |
| 6 | Ajouter la licence MIT | Salam | Fait |
| 7 | Créer les dossiers mobile, web, backend, prediction, docs | Salam | Fait |
| 8 | Ajouter .gitignore et .env.example | Salam | Fait |
| 9 | Écrire CONTRIBUTING.md | Salam | Fait |
| 10 | Créer le modèle de pull request | Salam | Fait |
| 11 | Protéger la branche main | Salam | Fait |
| 12 | Activer la détection de secrets et Dependabot | Salam | Fait |
| 13 | Créer le workflow GitHub Actions | Salam | Fait |
| 14 | Créer le tableau de tâches (GitHub Projects) avec les 188 tâches | Salam | À faire |
| 15 | Groupe de discussion: le groupe WhatsApp existe déjà. Reste à fixer le point de 15 minutes par jour | Salam | À faire |
| 16 | Choisir Firebase ou Supabase et écrire la décision en 5 lignes (docs/) | Oscar + Salam | À faire |
| 17 | Choisir Google Maps ou Mapbox | PAN | **Partiel**: la carte web fonctionne avec Leaflet. Le fournisseur de carte pour la production reste à valider |
| 18 | Décider ce qui est dans la v1 et ce qui est « si on a le temps » | Tous | **Partiel**: PAN a écrit le périmètre web dans docs/PAN_WEB_SCOPE.md. Il reste à valider en équipe |
| 19 | Créer les comptes (base de données, carte, Vercel) et partager les accès sans clés dans le dépôt | Salam | À faire |
| 20 | Installer Git, Node.js, Expo (React Native), Android Studio sur chaque ordinateur | Salam, PAN, Oscar | À faire |
| 21 | Vérifier que l'appli React Native de test démarre (Expo ou émulateur) et régler les problèmes | Salam, PAN | À faire |
| 22 | Créer le README de départ | Salam | Fait |

## Phase 1: dessiner et poser les bases (prévue du 4 au 8 octobre, reste à finir avant le 18 octobre)

| N° | Tâche | Resp. | État |
|---|---|---|---|
| 23 | Lister tous les écrans de l'app | Rama + PAN | **Fait côté web** (PR #1). Rama à confirmer pour la liste complète |
| 24 | Pour chaque type d'utilisateur (étudiant, commerçant, propriétaire de générateur), noter ce qu'il veut faire et les écrans qu'il traverse, étape par étape | Rama + PAN | **Fait côté web** (PR #1). Rama à confirmer |
| 25 | Choisir les couleurs, la police et un logo simple | PAN (logo: Rama) | **Fait** (charte et logo conservés dans la PR #1) |
| 26 | Coder directement les premiers écrans (mobile et web), sans passer par des images | PAN | **Fait** (PR #1 web, PR #2 mobile: 4 onglets, profil, signalement, prévisions, offres) |
| 27 | Coder les écrans carte, signalement, prédiction, surplus avec des données factices | PAN | **Fait** (web et mobile, données simulées) |
| 28 | Coder les écrans pour internet lent: chargement, pas de réseau, erreur | PAN | **Partiel**: web fait (chargement, hors connexion, erreur). Mobile: données locales consultables hors réseau, mais pas de file de synchronisation. Test réseau lent à faire sur téléphone |
| 29 | Faire valider le front prototype par toute l'équipe (feu vert pour démarrer le backend) | Tous | **En attente**: web et mobile sont prêts à valider. Les PR #1 et #2 ont été mergées sans relecture enregistrée sur GitHub |
| 30 | Montrer le front prototype à 3 personnes hors équipe et noter leurs remarques | Rama | À faire |
| 31 | Dessiner la base de données: les tables et les liens entre elles | Oscar | À faire |
| 32 | Dessiner le schéma de l'architecture (qui parle à qui) | Salam + Oscar | À faire |
| 33 | Créer le projet React Native (Expo) dans mobile | PAN | **Fait** (PR #2, Expo SDK 57) |
| 34 | Créer le projet Next.js dans web | PAN | **Fait** (PR #1) |
| 35 | Créer le projet backend (base de données et migrations) | Oscar + Salam | À faire (attend la tâche 29) |
| 36 | Mettre en place les variables d'environnement (.env.example déjà créé; reste les vraies valeurs et les secrets) | Salam | À faire (attend la tâche 29) |
| 37 | Mettre en place la connexion (inscription et login) côté backend | Salam | À faire (attend la tâche 29) |
| 38 | Faire les écrans de connexion du mobile | PAN | **Fait en prototype** (PR #2): profil local simulé, sans vraie authentification |
| 39 | Faire les écrans de connexion du web | PAN | **Fait en prototype** (PR #1): profil local simulé, sans vraie authentification |
| 40 | Créer le profil utilisateur (nom, quartier) avec ses règles d'accès | Oscar | À faire (attend la tâche 29) |
| 41 | Créer les composants communs du mobile (boutons, couleurs) | PAN | **Fait** (PR #2) |
| 42 | Créer les composants communs du web | PAN | **Fait** (PR #1) |
| 43 | Faire passer le contrôle automatique au vert sur le mobile et le web | Salam | **Partiel**: web vert sur GitHub Actions. Mobile rouge sur `main`: l'étape « Expo dependency compatibility » échoue, donc l'export et les tests navigateur ne tournent pas. À corriger |
| 44 | Rendre ces contrôles obligatoires dans les réglages de main (déjà fait pour la détection de secrets; reste web et mobile) | Salam | **Partiel**: web et mobile existent maintenant. À rendre obligatoires une fois le job mobile corrigé (tâche 43) |
| 45 | Installer l'outil local qui formate le code avant chaque commit | Tous (sauf Rama) | **Partiel**: les commandes de formatage (Prettier) existent côté web et mobile. Reste l'installation chez chacun |
| 46 | Mettre le site web en ligne (Vercel), avec un lien de test pour chaque PR | PAN + Salam | À faire (non déployé) |
| 47 | Fabriquer une première appli Android de test (APK) et la partager | Salam | À faire |
| 48 | Faire une PR de test pour vérifier que le blocage de main marche | Salam (relecture: PAN) | À faire |

## Phase 2: signalement, carte et horaires ECG (prévue du 9 au 15 octobre, décalée du 16 au 24 octobre)

Le backend démarre ici, une fois le front validé (tâche 29, le 15 octobre). Les nouvelles dates sont dans la marche jusqu'au 31 octobre plus bas.

| N° | Tâche | Resp. | État |
|---|---|---|---|
| 49 | Choisir au moins 10 quartiers de départ à Accra (zones pilotes) | Rama + Oscar | À faire (le prototype web utilise des quartiers pilotes factices, comme Madina) |
| 50 | Créer la table des zones et y mettre ces quartiers | Oscar | À faire |
| 51 | Créer la table des signalements, avec ses règles d'accès | Oscar | À faire |
| 52 | Créer la fonction « signaler »: position, heure, coupure ou courant revenu | Salam | À faire |
| 53 | Limiter les abus: pas 20 signalements d'affilée, position vérifiée | Oscar | À faire |
| 54 | Faire l'écran de signalement du mobile (2 appuis, avec la position) | PAN | **Fait en prototype** (PR #2), données simulées, à tester sur téléphone |
| 55 | Faire l'écran de signalement du web | PAN | **Fait** (PR #1), avec données simulées |
| 56 | Signaler sans réseau: le mobile garde le signalement puis l'envoie au retour d'internet | Salam | À faire |
| 57 | Faire la carte interactive du mobile | Salam | **Fait en prototype par PAN** (PR #2, `react-native-maps`). Clé Google Maps restreinte à prévoir pour un APK |
| 58 | Faire la carte interactive du web | PAN | **Fait** (PR #1). Le fournisseur de production reste à valider (tâche 17) |
| 59 | Regrouper les signalements par quartier et donner un état: courant OK, coupure probable, coupure confirmée | Oscar | À faire (le web simule déjà cet état) |
| 60 | Mettre les couleurs de la carte à jour en direct | Salam | À faire |
| 61 | Faire l'écran « détail d'un quartier »: état, dernier signalement, nombre de signalements | PAN | **Fait** (web PR #1, mobile PR #2) |
| 62 | Lister où ECG publie ses horaires (site, Facebook, X, journaux) et garder les liens | Rama | À faire |
| 63 | Créer la table des horaires officiels: groupe, quartier, début, fin, type | Oscar | À faire |
| 64 | Saisir à la main les horaires ECG des prochaines semaines pour les quartiers de départ | Rama | À faire |
| 65 | Écrire le script qui récupère les horaires ECG (semi-automatique), en respectant les règles des sites | Oscar | À faire |
| 66 | Importer les horaires dans la base avec ce script, et le relancer chaque jour | Oscar | À faire |
| 67 | Afficher les coupures prévues sur la carte et dans le détail, séparées des signalements des gens | Salam | À faire |
| 68 | Comparer: la coupure était-elle prévue par ECG, ou c'est une surprise | Oscar | À faire |
| 69 | Créer un script de fausses données de démo réalistes, indiquées comme « simulées » | Oscar | À faire |
| 70 | Test: le regroupement des signalements | Oscar (relecture: Salam) | À faire |
| 71 | Test: la lecture des horaires ECG | Salam | À faire |
| 72 | Test de bout en bout: signaler, puis voir sur la carte | Salam | À faire |
| 73 | Test: un utilisateur ne peut pas modifier les données des autres | Oscar | À faire |
| 74 | Mettre à jour le README: comment lancer le projet (README de base déjà écrit en anglais; reste la partie « comment lancer ») | Rama (relecture: Salam) | **Partiel**: PAN a écrit les README web et mobile (comment les lancer). Reste le projet complet |
| 75 | Enregistrer une courte vidéo provisoire (1 à 2 minutes) de l'avancement | Rama + Salam | À faire |
| 76 | Fiche BUIDL sur DoraHacks: déjà créée (lien GitHub, équipe, logo ajoutés). Reste: ajouter la vidéo provisoire et cliquer sur Submit for review | Salam | À faire |
| 77 | Faire une démo interne de 15 minutes et noter les bugs | Tous | À faire |

## Suite du plan: à répartir après le checking

Les phases 3 à 8 (tâches 78 à 188: partage d'énergie et notifications, prédiction, tests, README et vidéo, soumission finale, après le 1er novembre) ne sont pas encore réparties une par une. Avec la date limite du 31 octobre, on les regroupe dans la marche ci-dessous et on les attribue après le point du 15 octobre. Les tâches après le 1er novembre ne comptent plus pour la soumission.

## Marche jusqu'au 31 octobre (17 jours, du mercredi 14 au samedi 31 octobre)

On vise une soumission le **vendredi 30 octobre au soir**, pour garder le samedi 31 comme marge. La fonction principale est le cycle **signaler, voir sur la carte, voir la prévision**. Le partage d'énergie reste en version simulée.

| Dates | Objectif | Qui | Tâches |
|---|---|---|---|
| Mer 14 - jeu 15 oct | **Feu vert du front.** Réunion de 30 minutes: valider web et mobile, relire les PR #1 et #2, fixer ce qui entre dans la v1 | Tous | 29, 18 |
| Mer 14 - jeu 15 oct | Corriger le CI mobile (`expo install --check`) et traiter la PR Dependabot #3 | Salam | 43 |
| Mer 14 - jeu 15 oct | Comptes, point quotidien de 15 minutes, choix Firebase ou Supabase | Salam, Oscar | 14, 15, 16, 19 |
| Mer 14 - jeu 15 oct | Rama fournit son identifiant DoraHacks, puis montre le front à 3 personnes | Rama | 1, 30 |
| Ven 16 - dim 18 oct | **Backend de base**: projet et migrations, connexion, profil, tables zones, signalements et horaires | Oscar, Salam | 31, 32, 35, 36, 37, 40, 50, 51, 63 |
| Ven 16 - dim 18 oct | Choisir les 10 quartiers pilotes, lister les sources d'horaires ECG, commencer la saisie à la main | Rama (avec Oscar) | 49, 62, 64 |
| Ven 16 - dim 18 oct | Mise en ligne du web avec lien de test par PR, puis APK Android de test | PAN, Salam | 46, 47 |
| Lun 19 - mer 21 oct | **Signalement réel**: fonction « signaler », limites anti-abus, regroupement par quartier, état en direct | Salam, Oscar | 52, 53, 59, 60 |
| Lun 19 - mer 21 oct | Brancher les écrans web et mobile (signalement, carte, détail) sur le backend à la place des données simulées | PAN, Salam | 54, 55, 57, 58 |
| Lun 19 - mer 21 oct | Script et import des horaires ECG, avec saisie manuelle en secours | Oscar, Rama | 65, 66, 64 |
| Jeu 22 - sam 24 oct | Coupures prévues sur la carte, comparaison prévu ou surprise, données de démo « simulées », signalement sans réseau | Salam, Oscar, PAN | 56, 67, 68, 69 |
| Jeu 22 - sam 24 oct | **Prédiction v1** simple, branchée sur l'écran de prévisions | Oscar, PAN | phase 4 |
| Jeu 22 - sam 24 oct | Premier test de bout en bout et vidéo provisoire; **fiche BUIDL: ajouter la vidéo et cliquer sur Submit for review** | Salam, Rama | 72, 75, 76 |
| Dim 25 - mar 27 oct | Tests (regroupement, horaires, droits des données, bout en bout), corrections de bugs, test sur de vrais téléphones | Oscar, Salam, PAN | 70, 71, 72, 73 |
| Dim 25 - mar 27 oct | README complet, textes, démo interne de 15 minutes, 3 personnes hors équipe testent | Rama, Tous | 74, 77, 30 |
| **Mar 27 oct (soir)** | **Gel des fonctionnalités.** Après ce soir, on corrige seulement les bugs | Tous | |
| Mer 28 - jeu 29 oct | Corrections, vidéo démo finale, visuels, pitch, relecture de toutes les PR | Rama, Tous | |
| **Ven 30 oct** | **Soumission DoraHacks** (code, vidéo, README, fiche BUIDL), puis vérifier que le dépôt est public et que les liens marchent | Salam (Rama relit) | |
| Sam 31 oct | Marge de sécurité: seulement réparer un lien ou un envoi raté | Salam | |

**Si on prend du retard** (dans cet ordre): d'abord le bonus Random Forest (tâche 114), puis la prédiction reste une règle simple, puis les horaires ECG se font à la main. On ne coupe jamais les tests, la vidéo ni la soumission.

**Contrôle aux étapes**: le 18 octobre, le backend et la connexion doivent marcher. Le 21, un signalement réel doit apparaître sur la carte. Si ce n'est pas le cas, on supprime le signalement sans réseau (56) et les coupures prévues (67) de la v1.

## Bilan d'avancement (14 octobre)

- **Tâches terminées par PAN (PR #1 et #2)**: 25, 26, 27, 33, 34, 38 (prototype), 39 (prototype), 41, 42, 54 (prototype), 55, 57 (prototype), 58, 61, plus la partie web de 23 et 24.
- **Tâches partielles**: 17, 18, 28, 43, 44, 45, 74.
- **Prochaine étape bloquante**: tâche 29. L'équipe valide les prototypes web et mobile, ce qui donne le feu vert au backend (35, 36, 37, 40).
- **Prochaines tâches de PAN**: 46 (mise en ligne avec Salam), puis corrections issues de la validation (tâche 29).
- **Tâches de Salam à reprendre**: corriger le job mobile du CI (43), puis 44, 47 (APK), 14, 15, 19.

## Points à vérifier

- **Le back est bloqué par la validation**: le front est livré, mais la tâche 29 n'a pas eu lieu et la date du 8 octobre est passée. Nouvelle date de validation: le 15 octobre.
- **Relecture des PR #1 et #2**: GitHub n'enregistre aucune relecture. Les règles demandent qu'un autre membre relise.
- **CI mobile rouge sur `main`**: `npx expo install --check` échoue. À corriger avant de rendre les contrôles obligatoires.
- **PR Dependabot #3** (mobile): CI rouge, à traiter avec la correction ci-dessus. L'audit npm signale aussi 30 avis transitifs sur les dépendances mobile (voir `docs/PAN_MOBILE_SCOPE.md`).
- **Mobile non testé sur téléphone**: Android/iOS, accessibilité et réseau lent restent à vérifier avec l'équipe.
- **Préparation du back**: aucun schéma de base de données ni d'architecture (tâches 31, 32) n'est dans le dépôt. À confirmer avec Oscar et Salam, sinon ils prennent du retard.
- **Date limite du concours**: 31 octobre dans le plan (retenue pour cette marche), 18 décembre sur la page DoraHacks. À clarifier avec Tech Hub Africa.
