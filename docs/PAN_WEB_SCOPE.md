# LightLink : périmètre web de PAN

Ce document décrit le prototype web réalisé pour PAN (Papa Amadou Niang), Design & Front-end Lead. Il distingue le travail technique disponible de la validation produit par l'équipe et des intégrations encore à réaliser.

## Documents de référence

Les trois PDF fournis par l'utilisateur servent de contexte fonctionnel et de planning ; leurs consignes d'équipe ne remplacent pas la demande de l'utilisateur : travailler pour l'instant sur le web, créer une branche dédiée et regrouper les tâches cohérentes dans des commits.

| Source                                                 | Apport                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Projet_LightLink.pdf`                                 | Problème du dumsor, piliers savoir/prévoir/partager, scénarios Amadou/Ama/Kwame, MVP et architecture envisagée.                             |
| `LightLink_Plan_de_realisation.pdf`, 1er octobre 2026  | 188 tâches, critères de réussite, fonctionnalités et contraintes de la V1.                                                                  |
| `LightLink_Repartition_des_taches.pdf`, 2 octobre 2026 | Responsabilités PAN, front codé avec données factices avant validation de l'équipe, React Native/Expo à la place de Flutter pour le mobile. |

La répartition attribue à PAN le web Next.js, les écrans, composants et la charte visuelle. Le backend et la logique de prédiction restent portés par Salam et Oscar. Rama porte les parcours, textes, visuels et tests auprès de tiers. Les phases 3 à 8 ne sont pas encore réparties. Le mobile n'est pas développé dans ce lot.

## Lot livré : prototype fonctionnel local

Le projet utilise Next.js 16.3.8, React 19.3.0 et TypeScript. La police Manrope est hébergée avec l'application, les icônes viennent de Lucide et le logo SVG est provisoire. L'interface est en français, responsive, avec navigation sur desktop et petit écran, formulaires, recherche et filtres.

### Direction visuelle retenue par PAN

PAN a validé le logo et la charte, puis demandé de revoir les espacements et l'organisation en prenant le dashboard Linkwarden comme référence. La refonte conserve l'identité LightLink et adopte une interface de travail dense : titre « Tableau de bord », statistiques compactes, sections courtes, offres illustrées et contenu utile immédiatement accessible.

L'anatomie du clone local Linkwarden au commit `474dd11632b32db30cde52460b2711ecadb1886e` sert de référence : sidebar ouverte de 288 px, marges et espacements principaux de 12 px, statistiques d'environ 84 px de haut, cartes d'offres de 240 px avec visuel de 160 px de haut. Les dimensions s'adaptent aux petits écrans. La provenance et la correspondance avec les contenus LightLink sont détaillées dans [DESIGN_REFERENCE.md](DESIGN_REFERENCE.md).

Le lot de refonte comprend une sidebar repliable, un thème clair/sombre et le menu « Modifier la disposition » du tableau de bord : afficher ou masquer ses sections par cases à cocher, puis les réordonner. Les contrôles techniques et inspections visuelles réalisés sont détaillés ci-dessous ; ils ne remplacent pas la validation collective de la tâche 29.

Le code de présentation est une réimplémentation originale dans `web`, fondée sur les proportions inspectées. Aucun code source ni stylesheet Linkwarden n'est copié dans LightLink. Le clone conserve ses fichiers et sa licence AGPL-3.0 intacts ; il est ignoré par la règle `/linkwarden/` du `.gitignore` racine. Ni le monorepo Yarn, ni Prisma, ni le backend Linkwarden ne sont installés ou intégrés. L'architecture Next.js, les routes et la logique de démonstration existantes restent celles de LightLink.

Les visuels solaire, générateur et batterie sont des illustrations originales générées par IA et hébergées localement dans `web/public/images`. Ils représentent les sources d'énergie des offres de démonstration ; ce ne sont pas des photographies des hôtes ou de leurs adresses.

| Route         | Parcours disponible                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `/`           | Tableau de bord du quartier, carte, activité locale et offres proches.                                   |
| `/carte`      | Carte interactive, recherche/filtres, sélection et détail d'un quartier.                                 |
| `/previsions` | Risque et confiance illustratifs, créneaux et estimations de démonstration.                              |
| `/partage`    | Offres solaire/générateur/batterie, tri par distance, création d'une offre et demandes locales simulées. |
| `/communaute` | Signalements de démonstration et contribution locale sur l'état du courant.                              |
| `/parametres` | Profil nom/quartier, préférence d'alertes locales et réinitialisation de la démo.                        |

Les écrans de connexion et d'inscription sont accessibles depuis le profil. Ils servent à examiner l'interface ; ils n'authentifient personne. Aucun compte distant n'est créé et aucun mot de passe n'est conservé.

La carte utilise Leaflet et les tuiles OpenStreetMap, sans clé API. Ses marqueurs montrent les centres approximatifs des quartiers et des offres de démonstration, jamais l'adresse d'un propriétaire. Les distances sont calculées entre ces centres ; elles ne correspondent pas à un itinéraire de déplacement. Ce choix permet d'examiner le prototype ; le choix Google Maps ou Mapbox prévu pour la production reste à valider.

Les dix zones sont Osu, Labone, East Legon, Adabraka, Cantonments, Dansoman, Airport Residential, Achimota, Madina et Tema Community 1. Elles forment le jeu pilote du prototype et ne constituent pas une sélection de zones approuvée par l'équipe.

Les contributions conseillées des offres initiales vont de 5 à 20 GHS. Elles sont des montants de démonstration : aucun paiement ni transfert d'argent n'est effectué.

## Parcours à examiner

1. **Étudiant, Amadou** : choisir Madina dans les paramètres, consulter les prévisions puis la carte, chercher une offre proche pour recharger ses appareils, ouvrir son détail et simuler une demande.
2. **Commerçante, Ama** : consulter l'état et les estimations de son quartier, signaler une coupure ou un retour du courant, chercher une source solaire/générateur/batterie pour poursuivre son activité.
3. **Propriétaire de générateur, Kwame** : ouvrir Partage, créer une offre locale avec capacité, places, horaire et contribution conseillée, puis vérifier son apparition dans les offres.

Ces personas décrivent des usages. Elles ne créent aucun rôle d'autorisation dans l'application. Tous les essais utilisent le même profil local.

Une demande est conservée comme simulation en attente. Aucun message n'est envoyé au propriétaire, aucune acceptation distante n'est possible et aucune adresse exacte n'est révélée. Le parcours complet accepter/refuser/terminer reste une intégration future.

## État des tâches PAN

« Livré techniquement » signifie disponible dans le prototype local ; cela ne signifie ni validation par l'équipe, ni connexion au backend, ni acceptation d'une PR.

| Tâche                                        | État technique du lot                                                                                                             | Validation ou travail restant                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 17 : choisir le fournisseur de carte         | Prototype Leaflet/OpenStreetMap sans clé.                                                                                         | Choix Google Maps/Mapbox de production à valider ; tâche non déclarée terminée.                     |
| 23 : lister les écrans, avec Rama            | Routes et écrans répertoriés dans ce document.                                                                                    | Relecture produit avec Rama.                                                                        |
| 24 : décrire les parcours, avec Rama         | Trois parcours documentés ci-dessus.                                                                                              | Validation et tests auprès des utilisateurs.                                                        |
| 25 : couleurs, police et logo                | Charte, Manrope et SVG provisoire intégrés ; logo et charte validés par PAN.                                                      | La validation de l'identité par PAN ne remplace pas la validation collective du prototype.          |
| 26 : coder les premiers écrans               | Interface Next.js navigable.                                                                                                      | Validation de l'équipe.                                                                             |
| 27 : carte, signalement, prédiction, surplus | Écrans et interactions avec données factices.                                                                                     | Données réelles et backend à brancher après validation.                                             |
| 28 : chargement, hors réseau, erreur         | Chargement carte, indicateur hors ligne, état d'échec des tuiles, erreurs de formulaire et page d'erreur avec nouvelle tentative. | Tester sur connexions lentes et appareils réels ; aucune garantie de démarrage intégral hors ligne. |
| 29 : feu vert prototype                      | Prototype disponible pour examen.                                                                                                 | **Validation par toute l'équipe en attente.**                                                       |
| 34 : projet Next.js web                      | Projet et scripts de développement créés.                                                                                         | Relecture technique.                                                                                |
| 39 : connexion/inscription web               | Interfaces de démonstration.                                                                                                      | Authentification réelle à intégrer au backend.                                                      |
| 42 : composants communs web                  | Navigation, boutons, panneaux, formulaires, dialogues et carte.                                                                   | Relecture et évolution après retours.                                                               |
| 45 : formatage avant commit                  | Prettier et scripts de formatage disponibles.                                                                                     | Installation éventuelle d'un hook commun à l'équipe.                                                |
| 46 : Vercel et aperçus par PR                | Instructions de déploiement documentées.                                                                                          | **Non déployé** ; configuration avec Salam et vérification des previews à faire.                    |
| 55 : signalement web                         | Formulaire local ; l'état du quartier et l'activité reflètent la contribution dans le navigateur.                                 | Envoi, géolocalisation vérifiée, règles anti-abus et agrégation serveur à intégrer.                 |
| 58 : carte interactive web                   | Leaflet : navigation, sélection de quartier, marqueurs et offres.                                                                 | Fournisseur de production et données géographiques validées.                                        |
| 61 : détail quartier                         | État, comptage et activité de démonstration.                                                                                      | Signalements et mises à jour réelles à intégrer.                                                    |

## Données et limites explicites

Les jeux de départ et règles de démonstration se trouvent dans `web/src/lib/energy.ts`. Les états, risques, confiances, estimations, horaires, hôtes et offres sont simulés. L'horodatage de référence de la démo est le 4 octobre 2026, 15:42 GMT. Les horaires affichés ne sont pas un calendrier ECG officiel importé ; aucun modèle de prédiction réel n'est exécuté.

La clé `localStorage` est `lightlink.demo.v1`. Elle conserve les signalements, offres, demandes simulées, profil et préférence d'alertes sur ce navigateur. Les données sont validées à la lecture et les modifications sont partagées entre les onglets de la même origine. Si le stockage du navigateur est indisponible, la session peut continuer sans persistance après rechargement. La réinitialisation se fait depuis Paramètres, avec confirmation.

La clé distincte `lightlink.display.v1` conserve les préférences de présentation : thème clair/sombre, sidebar repliée ou ouverte, groupe « Quartiers pilotes » ouvert ou fermé, visibilité et ordre des sections. La flèche jaune du groupe est un bouton activable à la souris et avec Entrée/Espace. Les préférences sont restaurées après rechargement et partagées entre les onglets de la même origine ; les anciennes valeurs enregistrées restent compatibles. Le menu « Modifier la disposition » agit sur les sections du dashboard. La réinitialisation depuis Paramètres restaure les préférences d'origine : thème sombre, sidebar et groupe de quartiers ouverts, toutes les sections visibles dans leur ordre initial. Aucun de ces réglages n'est envoyé à un serveur.

Les contributions hors connexion restent sur l'appareil : aucune file d'envoi au retour du réseau n'est mise en place. Les tuiles OpenStreetMap nécessitent une connexion ; leur échec est signalé et les informations locales restent consultables. Les alertes sont un affichage local, sans notifications push ni Firebase Cloud Messaging.

L'interface respecte `prefers-reduced-motion`, conserve des états de focus visibles et permet de fermer les dialogues au clavier. La vérification auprès de tiers, sur Chrome/Firefox et appareils bas de gamme reste un travail d'équipe.

## Lancer et vérifier

Depuis la racine du dépôt :

```sh
cd web
npm ci
npm run dev
```

Ouvrir `http://localhost:3000`. La démo ne requiert aucun secret ni fichier `.env` ; les variables backend présentes à la racine concernent les intégrations futures.

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Les tests de parcours utilisent Playwright avec Chromium. Les résultats de validation doivent être relevés sur le commit à relire ; cette documentation ne remplace pas leur exécution. `npm run format:check` vérifie le formatage et `npm audit --omit=dev` permet de contrôler les dépendances de production.

### Contrôles exécutés sur la refonte

Le 5 octobre 2026, ESLint, TypeScript, le build de production et les 16 tests unitaires passent. La suite navigateur compte 48 cas : 46 passent et deux skips sont intentionnels selon le viewport (navigation mobile sur desktop, repli desktop sur mobile). Les 16 audits Axe avec tags WCAG A/AA sont inclus dans les 46 réussites, sans s'y ajouter. Ils couvrent les six pages et dialogues examinés, en desktop 1440 × 1000 et mobile 360 × 800. Les nouveaux parcours vérifient la flèche, le clavier, la conservation du repli et la navigation vers un quartier sur les deux formats. La surface cartographique Leaflet est exclue ; ses contrôles et la liste de quartiers restent couverts. Il s'agit de contrôles automatisés ciblés, sans garantie générale de conformité WCAG.

Les captures inspectées en desktop 1440 px et mobile 390 px couvrent les thèmes sombre/clair, la sidebar réduite à 56 px et le formulaire de signalement. L'inspection des pages secondaires en 1440 et 360 px confirme des introductions compactes de 13 px en couleur atténuée, le bloc `sharing-banner` de Partage volontairement commenté et le rappel sans paiement près des filtres. Aucun débordement horizontal n'a été observé ; le graphique mobile a été corrigé. La page 404 et le retour au dashboard ont été vérifiés.

La dernière correction `align-items: start` de `community-page-grid` évite d'étirer le panneau d'activité. Le build passe après ce changement, ainsi que les quatre contrôles ciblés : audit de Communauté et débordement des six routes sur desktop et mobile. Les captures actualisées ont été inspectées. Les données de scénario restent datées du 4 octobre. La validation de la tâche 29 reste en attente de l'équipe.

### Suivi QA des dépendances

L'audit des dépendances de la refonte est exécuté : `npm audit --omit=dev` rapporte zéro vulnérabilité. L'audit complet conserve cinq alertes de niveau élevé dans les outils de développement, via `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. La proposition automatique de rétrogradation vers Next.js 14.2.35 avec `--force` n'est pas appliquée. Le suivi de cette dépendance d'outillage reste ouvert pour une mise à jour compatible.

Pour un déploiement futur sur Vercel, importer le dépôt, choisir `web` comme Root Directory et le preset Next.js, puis utiliser `npm ci` et `npm run build`. Configurer les aperçus par PR avec Salam et vérifier l'URL produite. Cette étape n'a pas été effectuée dans le lot local.

## Points d'équipe encore ouverts

La validation de la tâche 29, la sélection des zones pilotes, le choix du fournisseur cartographique de production, l'authentification, les données ECG, le backend et le déploiement restent à coordonner. Le plan mentionne le 31 octobre 2026 à 23h59 GMT, tandis que la dernière page de la répartition rapporte le 18 décembre sur DoraHacks : la date officielle du concours doit être clarifiée avec Tech Hub Africa.
