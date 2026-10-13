# Direction visuelle mobile — LightLink

La direction mobile privilégie une identité chaleureuse et immédiatement reconnaissable : jaune solaire, fond nuit, titres Manrope affirmés, coins généreux, photographie immersive et illustration de quartier. Le site desktop reste une référence métier ; les compositions sont propres au téléphone.

- **Accueil** : quartier accessible directement, grande carte solaire illustrée, état du courant, action principale contrastée, deux raccourcis, prévisions et offres en carrousel.
- **Navigation** : quatre destinations dans une barre flottante, icône active sur jaune, espace réservé dans les contenus et respect des zones sûres.
- **Offres** : visuel plein cadre, source et distance en surimpression, titre sur dégradé, contribution et disponibilités lisibles. Le détail conserve son action principale au bas de l’écran.
- **Carte** : surface cartographique, filtres tactiles, sélection reliée à une fiche de quartier et continuité vers les actions.
- **Formulaires** : sections numérotées, erreurs au niveau des champs, détails facultatifs repliables et action fixe.
- **Profil** : identité sur carte solaire, monogramme, compteurs locaux et segments demandes/offres. La modification se fait dans un panneau séparé qui protège la saisie non enregistrée.
- **Prévisions** : même scénario que le web, avec créneau, durée, confiance, histogramme et informations de transparence. Les valeurs sont centralisées dans `shared/forecast.ts`.
- **Communauté** : avatars, regroupement par date et fil chronologique ouvert ; les contributions de cet appareil sont identifiées.
- **Thèmes** : clair et sombre, avec contraste adapté ; le jaune reste associé aux actions prioritaires. L’illustration et les photos décrivent le scénario, pas de véritables installations.

## Illustration originale

Fichier intégré : [`mobile/assets/neighborhood-hero.webp`](../mobile/assets/neighborhood-hero.webp).

Généré le 8 octobre 2026 avec l’outil intégré `image_gen`, via le skill `imagegen`. Image source RGBA de 1536 × 1024, export WebP optimisé de 1100 px de large conservant l’alpha. Les trois illustrations d’offres existantes ont aussi été optimisées en WebP sans changer leur composition.

Prompt final :

> Use case: stylized-concept. Asset type: original hero illustration for LightLink, a premium mobile energy-sharing app in Accra. Create a beautifully crafted isometric miniature of a small contemporary Accra neighborhood: 4 warm ivory and ochre low-rise homes with flat roofs, a broad dark-blue solar-panel rooftop, a small blue portable battery by a shaded courtyard, two elegant palms and lush tropical planting, and a warm golden illuminated path joining the houses. Premium sophisticated 3D architectural editorial illustration, tactile matte materials, subtle texture, accurate soft contact shadows, carefully arranged compact island composition, 3/4 aerial view. Palette: cream, warm golden yellow #facb4c, deep petrol navy #132d39, muted sage green, minimal orange accents. Warm light glows from selected windows, suggesting neighbors sharing energy. Strong elegant silhouette and readable at 200px wide. The entire miniature floats as an isolated cutout on a genuinely TRANSPARENT background, preserve fine palm leaf alpha and soft shadows. No surrounding background, no sky, no frame. No text, no letters, no logos, no watermark, no UI, no people, no glowing sci-fi cables, no cartoon faces. One polished coherent artwork, landscape composition, all edges of miniature in frame.

Les captures de revue sont produites par Playwright dans `mobile/artifacts/` (ignoré par Git). Elles servent à examiner le rendu navigateur ; les gestes, polices système agrandies, clavier et carte native demandent une validation Android distincte.
