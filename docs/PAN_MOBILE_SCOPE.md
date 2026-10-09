# LightLink : périmètre mobile de PAN

Le lot développe le frontend mobile de LightLink dans `mobile/`, sur la branche dédiée `feature/mobile-front`. La demande autorise l'installation des dépendances utiles et des commits simples par ensemble cohérent. Le prototype web existant fournit la charte et les parcours ; le mobile reprend React Native / Expo, conformément au README et à la répartition des tâches citée dans [PAN_WEB_SCOPE.md](PAN_WEB_SCOPE.md).

## Prototype local

Le frontend utilise Expo SDK 57, React Native 0.86.3, TypeScript et Expo Router. Quatre onglets donnent accès à l'accueil, la carte, le partage et la communauté ; les écrans secondaires couvrent le profil et le choix du quartier, le signalement, la création et le détail d'offre et les prévisions.

| Parcours              | Résultat local                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Amadou, étudiant      | Choisir Madina, consulter les prévisions et les zones, trouver une offre puis créer une demande simulée.                   |
| Ama, commerçante      | Consulter son quartier, signaler une coupure ou un retour du courant, puis chercher une énergie disponible.                |
| Kwame, propriétaire   | Publier une offre, retrouver son détail et la suspendre ou la réactiver depuis Mes offres.                                 |
| Profil et préférences | Consulter son activité, ouvrir le panneau de modification du profil, choisir le thème et réinitialiser après confirmation. |

Les personas décrivent des usages, sans introduire de rôles d'autorisation. Les actions ne contactent aucun service distant.

## Direction visuelle

La charte LightLink approuvée par PAN est conservée : jaune `#facb4c`, navy `#132d39`, fond sombre `#121b22`, typographie Manrope et illustrations originales solaire/générateur/batterie. Le parcours mobile utilise des composants natifs, des onglets accessibles au pouce, des contenus courts et des écrans de formulaire adaptés au clavier. Les proportions desktop de [DESIGN_REFERENCE.md](DESIGN_REFERENCE.md) restent une référence d'organisation, sans imposer une sidebar ou une largeur fixe aux écrans mobiles.

Les visuels représentent des sources d'énergie de démonstration, sans prétendre montrer de véritables hôtes. Aucun code ou stylesheet du clone Linkwarden n'est repris dans ce lot.

L'accueil donne le ton avec sa carte jaune, ses illustrations de quartier et ses raccourcis. Les autres écrans reprennent cette hiérarchie, les mêmes espacements et les deux thèmes :

- Le profil est un espace personnel avec identité et monogramme, compteurs issus des contributions locales et segments Mes demandes / Mes offres. Le bouton **Modifier mon profil** ouvre un panneau dédié au nom et au quartier. La fermeture protège les modifications non enregistrées ; les préférences et la réinitialisation sont regroupées sous l'activité.
- Partage présente les sources en cartes illustrées, avec choix du quartier d'origine, recherche, filtres et tri par proximité, budget ou places. Le détail met l'offre en scène et garde le prix et l'action principale accessibles dans un pied de page fixe.
- Les prévisions utilisent une présentation commune pour le graphique, la fenêtre et la durée du scénario. `shared/forecast.ts` fournit ces valeurs au web et au mobile ; elles ne constituent pas un modèle prédictif. Le scénario montre un pic de 78 % vers 18 h et une fenêtre de 18:00 à 20:30.
- La communauté affiche une timeline chronologique regroupée par date, des avatars dérivés des noms et un repère pour les contributions de cet appareil. Un filtre permet de consulter son quartier et le chargement progressif limite la longueur du fil.

Les panneaux respectent le réglage de réduction des animations. Les compteurs et états reflètent les données locales disponibles, sans inventer d'activité distante.

## État et intégrations

`shared/energy.ts` fournit un modèle pur commun au web et au mobile. Le repository mobile valide les données lues, attend la fin du chargement local avant toute modification et sérialise les écritures AsyncStorage. La clé `lightlink.mobile.demo.v1` conserve le scénario mobile ; `lightlink.mobile.display.v1` conserve le thème. Les clés sont distinctes de celles du frontend web.

Le scénario reste daté du 4 octobre 2026, 15:42 GMT. Statuts et prévisions sont illustratifs ; les nouvelles contributions locales portent un horodatage UTC. Les limites sont de 200 signalements, 100 offres et 100 demandes. Les offres donnent des centres approximatifs de quartier, des distances à vol d'oiseau et une contribution conseillée GHS sans paiement. Une demande reste en attente localement, ne consomme pas de place et peut être annulée. Une offre publiée sur cet appareil ne peut pas être demandée par son auteur ; sa suspension la masque des résultats disponibles et sa réactivation la rend à nouveau consultable. Ces changements persistent localement. Les brouillons de signalement par quartier et de publication sont conservés localement puis effacés avec la réinitialisation.

En cas d'indisponibilité du stockage, la session peut continuer avec un avertissement ; ses nouveaux changements ne sont pas garantis après fermeture. Les informations locales restent consultables hors réseau une fois chargées, sans file de synchronisation. Le fond de carte dépend du réseau ; le démarrage complet hors connexion via Expo Go n'est pas garanti.

La carte native utilise `react-native-maps` : Google Maps sur Android et Apple Maps sur iOS. Le rendu navigateur possède une adaptation distincte pour les revues. [Expo documente le test dans Expo Go sans configuration supplémentaire](https://docs.expo.dev/versions/latest/sdk/map-view/). La création d'un binaire Android nécessitera une clé Maps restreinte et une configuration native ; ce travail et le fournisseur de production restent à valider.

Aucune authentification réelle, donnée ECG officielle, prédiction de production, écriture backend, acceptation d'hôte, paiement ou notification push n'est intégré. Aucun projet EAS, APK/IPA ou déploiement store n'est créé dans ce lot.

## Lancer et relire

Les commandes complètes sont dans [mobile/README.md](../mobile/README.md). Depuis `mobile/`, installer avec `npm ci`, démarrer avec `npm start`, puis utiliser un [Expo Go compatible avec SDK 57](https://expo.dev/go). Sous Windows PowerShell, utiliser `npm.cmd` et `npx.cmd`, sans changer l'ExecutionPolicy.

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

Le contrôle CI mobile remplace l'ancien job Flutter par Node/npm, les vérifications Expo et les parcours Playwright. Les bundles exportés ne constituent pas des binaires Android/iOS ; les contrôles navigateur ne valident pas le comportement d'un téléphone.

## Résultats de vérification

Vérifications locales du **9 octobre 2026**, sur le contenu de cette branche avant publication de la PR :

| Contrôle                                                    | État à relever                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formatage, lint et TypeScript                               | Réussis pour mobile et modèle partagé.                                                                                                                             |
| Tests du domaine et de la persistance                       | 14 tests mobile et 16 tests web réussis.                                                                                                                           |
| Compatibilité des dépendances Expo                          | `expo install --check` réussi.                                                                                                                                     |
| Export des bundles Android/iOS/web                          | Réussi, Android et iOS compilés avec Hermes.                                                                                                                       |
| Parcours navigateur et captures inspectées                  | 35 tests réussis, 1 capture exclue sur le second viewport ; 4 contrôles ciblés supplémentaires réussis après l'ajustement du tri. 18 captures clair/sombre relues. |
| Android/iOS sur appareil ou émulateur                       | Non vérifié dans cet environnement.                                                                                                                                |
| VoiceOver/TalkBack, clavier logiciel, gestes et zones sûres | À tester sur appareils.                                                                                                                                            |
| Réseau lent et appareil bas de gamme                        | À tester avec l'équipe.                                                                                                                                            |
| Validation produit et checks GitHub                         | En attente de relecture et exécution distante.                                                                                                                     |

Le build web, TypeScript et le lint des composants web modifiés réussissent également. Le formatage web est conforme avec `--end-of-line=auto`, les fichiers existants étant extraits en CRLF sous Windows.

Les tests navigateur couvrent les tailles Pixel 7 et Galaxy S9+, avec un contrôle du panneau de tri à 360 × 380 px. Sous Windows, le serveur temporaire de la première passe a dû être fermé explicitement après les tests ; la passe ciblée suivante, exécutée avec les droits nécessaires au nettoyage des processus, s'est terminée normalement.

L'audit npm des dépendances de production a relevé 30 avis transitifs (19 élevés, 11 modérés). Les correctifs proposés automatiquement changent les versions majeures Expo/Router ou dégradent le SDK ; aucun `audit fix --force` n'a été appliqué. Cet état doit être traité avant une distribution de production et reste distinct de la compatibilité SDK vérifiée ici.

Les commits regroupent le modèle partagé, les écrans/parcours mobiles et la vérification/documentation. La branche reste soumise au processus PR et à la relecture d'un autre membre décrit dans [CONTRIBUTING.md](../CONTRIBUTING.md).
