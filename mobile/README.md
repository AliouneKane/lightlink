# LightLink mobile

Frontend mobile React Native / Expo de LightLink : suivre l'état du courant à Accra, contribuer sur son quartier et trouver une offre d'énergie proche. Les écrans utilisent des composants natifs, Expo Router et des données locales de démonstration. La validation produit de l'équipe et les essais sur appareils restent à réaliser.

## Démarrer

Prérequis : Node.js 24 et npm. Depuis la racine du dépôt :

```sh
cd mobile
npm ci
npm start
```

Sur Windows PowerShell, les commandes suivantes évitent de dépendre de l'exécution des scripts `.ps1` ; il n'est pas nécessaire de changer l'ExecutionPolicy :

```powershell
cd mobile
npm.cmd ci
npm.cmd run start:lan
```

Installer une version d'Expo Go **compatible avec SDK 57** depuis [expo.dev/go](https://expo.dev/go), puis scanner le QR code affiché dans le terminal. Le téléphone et l'ordinateur doivent pouvoir communiquer sur le même réseau. Vérifier la version proposée pour son appareil ; la version déjà installée depuis un store n'est pas automatiquement adaptée à ce projet.

Sur Android, scanner depuis Expo Go. `npm.cmd run start:lan` force le réseau local et Expo Go. Après une mise à jour importante, `npm.cmd run start:clear` redémarre en vidant le cache Metro. Autoriser Node.js sur le réseau privé dans le pare-feu Windows si le QR code reste inaccessible ; éviter le réseau invité et les VPN qui isolent les appareils.

Pour examiner l'interface dans le navigateur :

```sh
npm run web
```

Sous PowerShell : `npm.cmd run web`. Ce rendu utilise React Native Web et une vue cartographique adaptée au navigateur. Il permet de vérifier les parcours et leur présentation, mais ne valide pas la carte native, les gestes, le clavier logiciel, les vibrations ou les zones sûres d'un appareil.

Les scripts `npm run android` et `npm run ios` supposent un environnement natif déjà configuré. Aucun émulateur Android ni simulateur iOS n'est fourni dans le dépôt ; le simulateur iOS requiert macOS. Le projet n'est pas encore relié à un projet EAS et aucun binaire APK/IPA n'est publié.

## Stack et navigation

- Expo SDK 57 (`~57.0.27`), React Native `0.86.3`, React `19.2.3` et TypeScript.
- Expo Router pour les onglets et les écrans secondaires ; AsyncStorage pour les données locales.
- Manrope, icônes Lucide, thèmes sombre/clair et identité jaune/navy de LightLink.
- `react-native-maps` `1.27.2` sur Android/iOS, avec une adaptation web distincte.

| Route         | Parcours                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| `/`           | Accueil, quartier suivi, état du courant et offres proches.                  |
| `/carte`      | Quartiers pilotes, filtres et détail d'une zone.                             |
| `/partage`    | Offres par source, recherche et proximité ; demandes simulées et annulation. |
| `/communaute` | Activité locale et signalements des habitants de démonstration.              |
| `/profil`     | Profil, demandes, offres personnelles, thème et réinitialisation.            |
| `/signaler`   | Signalement local d'une coupure ou d'un retour du courant.                   |
| `/publier`    | Création d'une offre avec source, capacité, contribution et horaire.         |
| `/previsions` | Risque, confiance et créneaux illustratifs.                                  |
| `/offre/[id]` | Détail d'une offre et demande d'énergie simulée.                             |

## Données locales et limites

Le modèle de démonstration est partagé dans `shared/energy.ts`. Les dix zones et les offres initiales correspondent au scénario du **4 octobre 2026, 15:42 GMT**. Les statuts, hôtes, risques, confiances, estimations et créneaux sont simulés ; aucun calendrier ECG officiel ni modèle prédictif réel n'est intégré.

La clé AsyncStorage `lightlink.mobile.demo.v1` conserve le profil nom/quartier, les signalements, les offres, les demandes et la préférence d'alertes. Elle est distincte du stockage du frontend web. Les données sont lues et validées avant toute écriture. Les écritures sont sérialisées ; si la lecture ou l'écriture échoue, les actions restent utilisables pendant la session et une alerte signale l'absence de conservation. Aucun mot de passe ni adresse e-mail n'est enregistré.

Le stockage conserve au maximum 200 signalements, 100 offres et 100 demandes. Les nouvelles contributions remplacent les plus anciens signalements au-delà de la limite ; les créations d'offres ou demandes sont refusées quand leur limite est atteinte. Une demande déjà en attente ne peut pas être répétée et une offre publiée sur cet appareil ne peut pas être demandée par son auteur. Une demande simulée ne consomme pas les places de l'offre.

`lightlink.mobile.display.v1` conserve le choix du thème. La réinitialisation depuis le profil restaure le scénario local et le thème sombre, après confirmation.

Les formulaires de signalement et de publication conservent leur brouillon sur cet appareil. Il est effacé après validation, sur demande ou lors de la réinitialisation. Les offres personnelles peuvent être suspendues et réactivées depuis leur détail ou « Mes offres » ; seules les offres disponibles apparaissent dans la recherche. Le tri propose proximité, contribution conseillée et nombre de places.

Les signalements, offres et demandes restent sur l'appareil : aucun compte distant, backend, envoi à un hôte, paiement ou notification push n'est connecté. Les contributions GHS sont des montants de démonstration. Les coordonnées représentent les centres approximatifs des quartiers, jamais une adresse privée ; les distances sont calculées à vol d'oiseau.

Les données locales déjà chargées restent consultables hors connexion. Aucun envoi différé ni synchronisation au retour du réseau n'est mis en place. Le fond de carte nécessite une connexion et peut rester indisponible ; les informations et la liste des quartiers permettent de continuer à examiner les données. Il n'y a pas de garantie générale de démarrage hors connexion via Expo Go.

## Carte native et futur binaire

Le prototype utilise Google Maps sur Android et Apple Maps sur iOS. [La documentation Expo](https://docs.expo.dev/versions/latest/sdk/map-view/) permet de tester `react-native-maps` dans Expo Go sans configuration de clé propre à l'application. Ce choix technique de prototype ne valide pas le fournisseur de production.

Un binaire Android utilisant Google Maps nécessite une configuration dédiée : Maps SDK, clé restreinte au package et à l'empreinte du certificat, puis configuration native et reconstruction. Aucune clé de production n'est définie ici. Si Google Maps est choisi pour iOS, une configuration iOS correspondante sera aussi nécessaire. Préparer ces éléments avec l'équipe avant de créer ou distribuer un binaire.

## Vérifier

Depuis `mobile/` :

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npx expo install --check
npm run export
npx playwright install chromium
npm run test:e2e
```

Sous PowerShell, utiliser les mêmes commandes avec `npm.cmd` et `npx.cmd`. `npm run export` génère les bundles Android/iOS/web ; il ne compile pas un binaire natif. La suite Playwright examine le rendu navigateur et ne remplace pas une passe Android/iOS sur téléphone.

GitHub Actions exécute les contrôles mobiles avec Node.js 24, y compris les parcours navigateur. Les résultats de la passe finale restent à relever dans [PAN_MOBILE_SCOPE.md](../docs/PAN_MOBILE_SCOPE.md). Les validations sur téléphone, VoiceOver/TalkBack, réseau lent et appareil bas de gamme restent à effectuer séparément.
