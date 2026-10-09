# feat(mobile): ajouter le frontend LightLink avec Expo

LightLink dispose d'un frontend mobile React Native / Expo pour suivre son quartier, signaler l'état du courant et chercher ou partager de l'énergie. L'accueil illustré, les cartes de partage, le détail avec action fixe et la timeline communautaire reprennent la charte jaune/navy. Le profil présente l'identité et l'activité réelle de cet appareil ; la modification du nom et du quartier se fait dans un panneau dédié. Les demandes, offres suspendables, brouillons et préférences reposent sur un état local persistant validé.

`shared/energy.ts` porte le domaine commun et `shared/forecast.ts` harmonise le graphique, la fenêtre et la durée du scénario de prévision entre web et mobile. Les panneaux prennent en compte la réduction des animations.

Le job CI mobile passe de Flutter à Expo/npm. Les données restent simulées ; aucun compte, service backend, contact d'hôte, paiement ni notification push n'est connecté. Aucun binaire natif ou déploiement store n'est livré.

Branche : `feature/mobile-front`. Voir [le périmètre mobile](PAN_MOBILE_SCOPE.md) et [le README mobile](../mobile/README.md) pour les limites et les résultats relevés sur le commit final.

## Vérifier le parcours

Depuis `mobile/`, exécuter `npm ci` puis `npm start` et ouvrir le QR code avec un [Expo Go compatible SDK 57](https://expo.dev/go). Sous PowerShell, utiliser `npm.cmd` et `npx.cmd`. `npm run web` fournit un aperçu navigateur pour examiner l'interface.

1. Ouvrir le profil, toucher **Modifier mon profil**, choisir Madina puis enregistrer. Vérifier la fermeture du panneau et le retour vers l'accueil.
2. Consulter les prévisions et la carte, puis changer le quartier, la source et le tri dans Partage.
3. Signaler une coupure puis un retour du courant ; retrouver les contributions dans la timeline et vérifier l'état du quartier.
4. Publier une offre, consulter son détail et utiliser **Mes offres** pour la suspendre puis la réactiver. Demander une autre offre et annuler la demande depuis **Mes demandes**.
5. Modifier le profil sans enregistrer, fermer le panneau puis vérifier les choix de conservation ou d'abandon. Recharger pour examiner la persistance des données et du thème.
6. Réinitialiser après confirmation ; vérifier le profil initial, le thème et l'effacement des contributions et brouillons locaux.

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

## Validation locale — 9 octobre 2026

- Mobile : formatage, ESLint et TypeScript réussis ; 14 tests unitaires réussis ; versions Expo compatibles.
- Export des trois plateformes réussi : Android et iOS avec Hermes, web pour la revue navigateur.
- Parcours Pixel 7 et Galaxy S9+ : 35 tests réussis et 1 capture exclue sur le second viewport. Après l'ajustement du tri, 4 contrôles ciblés supplémentaires réussis, dont le panneau à 360 × 380 px.
- 18 captures clair/sombre générées et relues. La CI publie les captures dans l'artefact `mobile-design-captures`.
- Web : build, TypeScript et 16 tests unitaires réussis. Le lint des composants modifiés passe ; le formatage passe avec `--end-of-line=auto` pour les fichiers CRLF du checkout Windows.

Les tests navigateur et les bundles ne remplacent pas une vérification native sur téléphone. Android/iOS, accessibilité système et réseau lent restent à examiner avec l'équipe. L'audit npm relève 30 avis transitifs ; leur résolution requiert une analyse des versions Expo compatibles, sans mise à jour forcée dans ce lot.

## Related task

Lot frontend mobile PAN, décrit dans `docs/PAN_MOBILE_SCOPE.md`. Branche dédiée existante : `feature/mobile-front` (sans numéro de ticket fourni).

## Checklist

- [x] Changements isolés sur une branche dédiée.
- [x] Vérifications locales documentées et captures relues.
- [x] Aucun secret ajouté ; données et actions de démonstration clairement identifiées.
- [ ] Checks GitHub Actions verts sur la PR.
- [ ] Validation Android sur appareil.
- [ ] Relecture et approbation par un autre membre avant fusion.
