# Référence de design : dashboard LightLink

PAN a validé le logo et la charte LightLink, puis demandé une reprise du dashboard avec les proportions et la densité de Linkwarden. La référence concerne l'organisation de l'interface ; le produit demeure LightLink, avec ses quartiers, signalements, prévisions et offres d'énergie.

## Provenance inspectée

- Référence visuelle demandée : [Linkwarden sur 21st.dev](https://21st.dev/community/apps/linkwarden).
- Source du clone : [dépôt Linkwarden](https://github.com/linkwarden/linkwarden).
- Révision inspectée : [commit 474dd11632b32db30cde52460b2711ecadb1886e](https://github.com/linkwarden/linkwarden/tree/474dd11632b32db30cde52460b2711ecadb1886e).
- Copie locale de référence : `/linkwarden`, conservée intacte et ignorée par la règle `/linkwarden/` du `.gitignore` racine.
- Image de référence locale : `.tools/design-reference/linkwarden.jpg`, utilisée pour comparer l'anatomie visible.

L'image 21st.dev et la version actuelle du clone peuvent montrer des détails différents. La refonte s'appuie sur les proportions visibles et sur les composants inspectés, en gardant les couleurs et le logo approuvés par PAN.

## Anatomie et correspondance métier

| Élément inspecté                       | Proportions de référence                                                                        | Traduction LightLink                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `SidebarShell.tsx` et `MainLayout.tsx` | Sidebar ouverte 288 px ; rail réduit 56 px ; contenu pleine hauteur.                            | Navigation LightLink, quartier suivi et profil local, avec repli de la sidebar.              |
| `pages/dashboard.tsx`                  | Padding et espacement principaux de 12 px ; titres/commandes compacts.                          | Titre « Tableau de bord », actions signaler/partager, contenu métier en sections.            |
| `DashboardItem.tsx`                    | Padding 12 px, icône 56 px, libellé 12 px, valeur 36 px ; hauteur de référence d'environ 84 px. | État du quartier, offres et signalements de la démo dans des statistiques compactes.         |
| `DashboardLinks.tsx`                   | Cartes de 240 px ; visuel de 160 px de haut ; rail horizontal et espacement 12 px.              | Offres solaire, générateur et batterie illustrées, avec quartier et contribution conseillée. |
| Organisation des sections du dashboard | Titres sobres et groupes successifs plutôt qu'un grand bloc de présentation.                    | Offres proches, carte des quartiers, prévisions et activité communautaire.                   |
| Personnalisation du dashboard          | Référence fonctionnelle de composition de l'espace de travail.                                  | Menu « Modifier la disposition » : visibilité par case à cocher et ordre des sections.       |
| Thème et sidebar                       | Apparence claire/sombre et navigation compacte.                                                 | Déclinaisons de la charte LightLink et sidebar repliable, sans changer le modèle métier.     |

Les dimensions ci-dessus guident la présentation desktop. Les petits écrans nécessitent une adaptation responsive ; les valeurs ne constituent pas des largeurs fixes imposées sur mobile.

## Réimplémentation dans le projet existant

La présentation est écrite avec les composants et styles originaux de LightLink dans `web`, sous Next.js 16.3.8 / React 19.3.0 / TypeScript. L'inspection du clone sert à établir l'anatomie et les espacements. Aucun composant source, stylesheet, asset de marque ni code backend Linkwarden n'est copié ou adapté dans le code LightLink.

La logique locale de signalement, de tri par distance, de profil et de demande simulée reste celle du prototype. Les routes `/`, `/carte`, `/previsions`, `/partage`, `/communaute` et `/parametres` restent les points d'entrée. Les interactions de personnalisation sont des préférences d'interface ; elles ne créent ni rôle d'autorisation, ni authentification, ni service distant.

Le menu « Modifier la disposition » permet de masquer ou afficher les sections et de les déplacer dans l'ordre du dashboard. La clé `localStorage` `lightlink.display.v1` conserve le thème clair/sombre, le repli de la sidebar, la visibilité et l'ordre des sections. Ces valeurs sont restaurées après rechargement et partagées entre les onglets de la même origine. Depuis Paramètres, la réinitialisation des données locales restaure également ces préférences : thème sombre, sidebar ouverte et toutes les sections visibles dans l'ordre initial. Si le stockage du navigateur est indisponible, les changements restent utilisables pendant la session, sans garantie de conservation après rechargement.

Le titre du dashboard et les libellés sont en français. La hiérarchie donne la priorité aux données et actions de quartier, avec des statistiques compactes et des cartes d'offres ; elle conserve le logo SVG et la charte validés.

Les trois visuels d'énergie sont des images originales générées par IA et hébergées localement : `web/public/images/solar.png`, `generator.png`, `battery.png`. Ils sont destinés aux offres de démonstration et aux essais visuels ; ils ne sont ni des photographies de vrais hôtes ni des preuves d'une installation électrique réelle.

## Inspection avant toute installation de Linkwarden

L'inspection a porté sur `README.md`, `LICENSE.md`, `package.json`, `apps/web/package.json`, `.env.sample`, `packages/prisma/package.json`, `.yarnrc.yml`, les fichiers Docker et les composants de layout. Aucun fichier `.env` privé n'a été ouvert. Aucun script Linkwarden ni installation de ses dépendances n'a été exécuté.

| Fichier ou partie                 | Observation concrète                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                    | Yarn 4.12.0, workspaces `apps/*` et `packages/*`, scripts web et worker séparés.                                                                                 |
| `.yarnrc.yml`                     | `nodeLinker: node-modules`, `nmMode: hardlinks-local`.                                                                                                           |
| `apps/web/package.json`           | Next.js 15.5.21, React 19.1.0, Tailwind 3 / DaisyUI ; web en Pages Router.                                                                                       |
| Postinstall racine et web         | Déclenche `playwright install --with-deps chromium`, puis `patch-package` ; une installation complète peut télécharger le navigateur et ses dépendances système. |
| `.env.sample` public              | Exemples `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, paramètres stockage/recherche et providers optionnels.                                               |
| `packages/prisma/package.json`    | `generate` crée le client ; `dev` et `deploy` exécutent des migrations de base de données.                                                                       |
| Docker                            | Node 22.23, PostgreSQL 16 et Meilisearch 1.13.3 ; le démarrage de l'image exécute `prisma migrate deploy` avant web + worker.                                    |
| `MainLayout.tsx` et `Sidebar.tsx` | Imports utilisateur/préférences/collections/tags, `@linkwarden/router`, drag-and-drop, Pages Router et i18n ; ils ne sont pas directement autonomes.             |

Ces prérequis concernent l'application Linkwarden complète. Le travail de design LightLink n'a besoin d'aucun de ses services ni de ses scripts : il continue à s'exécuter depuis `web` avec les commandes npm documentées dans son README.

## Licence de la référence

La copie locale comporte la licence **GNU AGPL version 3**, confirmée par son `LICENSE.md` et le champ `license` du package web. Cette licence et les notices restent intactes dans le clone.

Si du code ou des styles protégés de Linkwarden étaient copiés ou adaptés à l'avenir, les obligations devraient être traitées pour cette reprise : conserver la licence et les notices, signaler les modifications, appliquer les conditions de distribution aux travaux concernés et proposer le code source correspondant aux utilisateurs d'une version modifiée accessible par réseau. Une reprise de code AGPL ne doit pas être annoncée comme exclusivement MIT.

Le présent lot effectue une réimplémentation originale de l'interface à partir de son anatomie inspectée ; il ne contient pas d'extraction de code Linkwarden. Cette distinction décrit ce qui a été fait, sans modifier les conditions du dépôt de référence.

## Vérification de la refonte

Contrôles exécutés le 5 octobre 2026 : ESLint, TypeScript, build de production et 14 tests unitaires passent. La suite navigateur complète comporte 46 cas : 44 passent et deux sont ignorés volontairement selon le viewport (navigation mobile sur desktop, repli desktop sur mobile). Les 16 audits Axe avec tags WCAG A/AA sont inclus dans les 44 cas réussis, et non additionnels. Ils couvrent les six pages et les dialogues contrôlés, aux formats 1440 × 1000 et 360 × 800. La surface cartographique Leaflet est exclue de ces audits ; ses contrôles et la liste des quartiers restent couverts. Ces résultats décrivent les vérifications réalisées, pas une garantie générale de conformité WCAG.

Les captures ont été inspectées en desktop 1440 px et mobile 390 px, pour les thèmes sombre/clair, la sidebar réduite à 56 px et le formulaire de signalement. Les pages secondaires ont aussi été inspectées aux largeurs 1440 et 360 px : leurs introductions utilisent un texte discret de 13 px ; sur Partage, le bloc `sharing-banner` reste volontairement commenté et le rappel sans paiement est compact, près des filtres. Aucun débordement horizontal n'a été observé ; le graphique mobile a été corrigé. La page 404 et son retour au dashboard ont été vérifiés. Les données et illustrations restent des éléments de démonstration.

La dernière correction CSS applique `align-items: start` à `community-page-grid` pour éviter d'étirer le panneau d'activité. Le build passe après cette correction, ainsi que les quatre contrôles ciblés : audit de Communauté et débordement des six routes sur desktop et mobile. Les captures actualisées ont été inspectées. Le scénario de données reste volontairement daté du 4 octobre, distinct de la date des vérifications.

La charte et le logo sont approuvés par PAN. La validation collective du prototype (tâche 29) et le déploiement restent en attente.
