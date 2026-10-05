# feat(web): créer le prototype LightLink et le dashboard de PAN

## What does this PR do?

Le web LightLink dispose désormais d'un prototype utilisable pour examiner le périmètre de PAN : choisir un quartier, consulter son état, contribuer et chercher de l'énergie. Le dashboard compact permet de travailler sur ces parcours depuis une même interface, sur desktop et mobile.

- Six pages avec carte interactive, signalement, prévisions illustratives, communauté et offres d'énergie ; recherche, filtres et demandes locales simulées.
- Layout original inspiré de l'anatomie Linkwarden, logo et charte conservés, thèmes clair/sombre, disposition personnalisable et sidebar repliable. Le groupe « Quartiers pilotes » se replie via une flèche jaune, reste accessible au clavier et conserve son état.
- États de chargement, hors connexion et erreur, profil local, préférences conservées après rechargement et réinitialisation depuis Paramètres.
- Tests unitaires et navigateur, audits d'accessibilité ciblés, configuration de contrôle et documentation de lancement, du périmètre PAN et de la référence visuelle.

Les données et actions sont explicitement simulées et restent dans le navigateur. Aucun backend, authentification réelle, envoi aux propriétaires ni paiement n'est intégré.

Voir [le périmètre PAN](https://github.com/AliouneKane/lightlink/blob/feature/pan-web-foundation/docs/PAN_WEB_SCOPE.md), [la référence visuelle et sa provenance](https://github.com/AliouneKane/lightlink/blob/feature/pan-web-foundation/docs/DESIGN_REFERENCE.md) et [le README web](https://github.com/AliouneKane/lightlink/blob/feature/pan-web-foundation/web/README.md) pour les détails et limites.

## Related task

Task number (from the project plan): #23, #24, #25, #26, #27, #28, #34, #39, #42, #55, #58, #61.

Lot frontend regroupé. La tâche #17 reste partielle (fournisseur de carte de production à valider), #45 fournit les commandes de formatage et #46 reste non déployée. La validation collective #29 et les contrôles GitHub restent à effectuer.

Branche : `feature/pan-web-foundation`, nom explicitement demandé par l'utilisateur pour ce lot, en exception au format numéroté `feature/<number>-<name>`.

## How to test

Depuis la racine :

```sh
cd web
npm ci
npm run dev
```

Ouvrir `http://localhost:3000` ; la démo ne nécessite aucune clé ni `.env`.

1. Parcourir les six pages en desktop/mobile, puis vérifier le retour au dashboard depuis une URL inconnue.
2. Sélectionner un quartier, ajouter un signalement, filtrer les offres et simuler une demande ; recharger pour vérifier la conservation locale.
3. Changer de thème, replier la sidebar, masquer/réordonner les sections et replier « Quartiers pilotes » avec la flèche jaune ; vérifier Tab puis Entrée/Espace et la conservation après rechargement.
4. Vérifier le mode hors connexion et les formulaires, puis réinitialiser depuis Paramètres pour restaurer les données et préférences d'origine.

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Dernière passe : formatage du code, lint, typecheck, build de production et 16 tests unitaires réussis. La suite navigateur compte 48 cas : 46 réussis et deux skips intentionnels selon le viewport (navigation mobile sur desktop, repli desktop sur mobile). Les 16 audits Axe sont inclus dans les 46 réussites. Le nouveau parcours flèche jaune, clavier, persistance et navigation vers Madina passe sur desktop et mobile. Les audits Axe restent ciblés : surface Leaflet exclue, contrôles et liste des quartiers couverts ; ils ne garantissent pas une conformité WCAG générale.

Audit de production : zéro vulnérabilité ; cinq alertes élevées restent dans l'outillage de développement via ESLint/`braces`, sans appliquer la rétrogradation Next.js proposée avec `--force`.

## Checklist

- [ ] My branch is named `feature/<number>-<name>`
- [ ] Automatic checks (GitHub Actions) are green
- [x] No password, key or secret in the code
- [x] I tested it myself
- [ ] Another member is asked to review (reply within 24h)

La branche utilise l'exception demandée ci-dessus. GitHub Actions et la demande de relecture n'ont pas été effectués ; Salam est le relecteur prévu pour PAN. Les changements ont été relus, aucun secret réel n'est ajouté et les vérifications locales ci-dessus passent. La validation collective de l'équipe reste en attente.
