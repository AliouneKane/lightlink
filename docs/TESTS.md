# Lancer les tests

Tâche 146. Tous les tests, ce qu'ils vérifient et comment les lancer. Les cinq premières familles tournent automatiquement sur GitHub Actions à chaque pull request.

| Famille | Commande (depuis la racine) | Durée | Ce qu'elle vérifie |
|---|---|---|---|
| **Prédiction** | `python3 -m unittest discover -s prediction/tests` | 1 s | Lecture des données, taux, annonces, délestage, saisie manuelle, import des horaires, SQL généré, vitesse |
| **Base de données** | `cd backend && npm ci && npm run test:sql` | 2 s | Toutes les migrations sur un Postgres en mémoire (sans Docker) : règles d'accès avec les vrais rôles, anti-abus, état des quartiers, partage d'énergie, notifications, données de démo |
| **Web, tests unitaires** | `cd web && npm ci && npm test` | 1 s | État en direct, prévisions, annonces ECG, partage, file et messages d'erreur |
| **Web, parcours navigateur** | `cd web && npm run build:e2e && npx playwright install chromium && npm run test:e2e` | 1 min | 46 parcours (signaler, carte, prévisions, partage, hors ligne, clavier, petits écrans) en mode démo |
| **Mobile, tests et parcours** | `cd mobile && npm ci && npm test && npm run test:e2e` | 2 min | Tests unitaires (file hors ligne, dépôt local) et 37 parcours de l'app dans un navigateur, en mode démo |
| **De bout en bout sur le projet hébergé** | `cd backend && SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run test:live` | 20 s | Signalement anonyme, temps réel, carte, droits, partage complet avec deux habitants, vitesse de lecture |
| **Charge** | `cd backend && npm run test:load` (projet relié) | 5 s | 100 signalements d'un coup, lecture de la carte ; données de test supprimées |

## Bon à savoir

- Les parcours navigateur forcent le **mode démo** (`build:e2e`, `test:e2e`), même si vos clés Supabase sont dans `web/.env.local` ou `mobile/.env` : ils n'écrivent jamais dans la vraie base.
- `test:live` et `test:load` écrivent dans la **vraie base** : seulement des signalements « courant disponible », des offres de test fermées à la fin et des signalements simulés supprimés. Les clés à donner sont les valeurs **publiques** (URL et clé publishable).
- Le CI vérifie aussi que le SQL et l'instantané de démo générés depuis `data/` sont à jour, le formatage (Prettier), le typage et l'absence de secrets (gitleaks).
- Sous Windows PowerShell, utilisez `npm.cmd` si l'exécution de scripts est restreinte ; toutes les commandes ci-dessus fonctionnent aussi sous Windows.
