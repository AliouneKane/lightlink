# facebook: données récupérées par l'agent Meta

Récoltées le **14 octobre 2026** avec le prompt [../prompts/PROMPT_AGENT_META.md](../prompts/PROMPT_AGENT_META.md).

**Attention: malgré le nom du dossier, ces données viennent d'Instagram**, pas de Facebook. L'agent n'a pas pu lire la page Facebook de l'ECG (0 annonce trouvée). Les annonces sont celles de la page Instagram officielle de l'ECG (@ecgghofficial).

| Fichier | Lignes | Contenu |
|---|---|---|
| `ecg_annonces.csv` | 79 | Coupures planifiées **Accra East** du 5 au 16 octobre 2026 |
| `temoignages.csv` | 0 | Aucun témoignage trouvé |
| `pages_trouvees.csv` | 5 | Pages officielles et médias: ECG sur Instagram (50 annonces) et sur Facebook (0), Joy News, 3News, YEN |

Les colonnes de `ecg_annonces.csv` sont **identiques** à celles de `../x/ecg_annonces.csv`.

## Les 2 publications sources

| Publication Instagram | Coupures | Lignes |
|---|---|---|
| [4 oct. 2026](https://www.instagram.com/p/DeFE0fdlm8l/) | 5 au 9 octobre | 45 |
| [10 oct. 2026](https://www.instagram.com/p/DeTcGjGALAs/) | 11 au 16 octobre | 34 |

Toutes les lignes sont `planned`, de 09:00 à 17:00, lues dans des images.

## Ce que ça apporte

- **Les coupures de l'Est d'Accra manquantes dans `../x/`**: la presse disait que les détails étaient dans des images, les voici.
- **Quartiers pilotes de LightLink concernés:**

| Date | Zone pilote | Localité dans l'annonce |
|---|---|---|
| 8 oct. | Madina | Madina |
| 9 oct. | East Legon | Parts of East Legon |
| 14 oct. | Madina | UN Madina, Madina Washington |
| 16 oct. | Madina | Parts of Madina |

C'est exploitable pour montrer des **vraies données** dans la démo (Madina est le quartier d'Amadou).

## Points d'attention

1. **« Parts of »** et **« et zones environnantes »**: seule une partie du quartier est coupée. Ne pas colorer tout le quartier en rouge.
2. **Il manque le 10 octobre** (aucune annonce) et **le 13 octobre** (pas de ligne Accra East). Ce n'est pas forcément qu'il n'y a pas eu de coupure, seulement qu'il n'y a pas d'annonce dans ces deux publications.
3. **Seulement Accra East.** Tema, Accra West, Volta et Eastern du 12 au 16 octobre ne sont pas dans ce fichier (Accra West est dans `../x/` et `../ecg/ecg_pannes_planifiees_2026.csv`).
4. **Des localités se répètent** (Libya Quarters les 8, 14 et 16 octobre; Abokobi les 5 et 9). C'est normal, ce sont des jours différents.
5. **Lecture d'images par une IA:** des fautes de lecture sont possibles (noms de lieux). À échantillonner contre les images avant d'importer.
6. **Aucun retour du courant:** pas d'heure de rétablissement.

---

## Ajout: annonces de 2025 (récolte du 14 octobre 2026)

| Fichier | Lignes | Contenu |
|---|---|---|
| `ecg_annonces_2025.csv` | 85 | Coupures planifiées du **17 septembre 2025** (42 lignes) et du **2 octobre 2025** (43 lignes) |
| `temoignages_2025.csv` | 0 | Aucun témoignage trouvé |
| `pages_trouvees_2025.csv` | 3 | ECG sur Facebook (30 annonces annoncées), Graphic Online, Pulse |

Mêmes colonnes que les autres `ecg_annonces*.csv`.

**Attention: ces lignes ne viennent pas de Facebook.** La colonne `compte` dit « via Graphic.com.gh »: l'agent a recopié deux **articles de Graphic Online** qui reprennent les annonces de l'ECG (`source_type` = `texte`). Les deux liens sont:

- [Coupures du 17 septembre 2025](https://www.graphic.com.gh/news/general-news/see-the-areas-that-will-be-affected-by-ecgs-planned-maintenance-on-september-17-2025.html)
- [Coupures du 2 octobre 2025](https://www.graphic.com.gh/news/general-news/see-the-areas-that-will-be-affected-by-ecgs-planned-maintenance-on-october-2-2025.html)

Le tableau `pages_trouvees_2025.csv` annonce 30 annonces pour la page Facebook de l'ECG, mais **aucune ligne du fichier ne pointe vers une publication Facebook**. Ce chiffre n'est pas vérifiable, à ne pas utiliser.

### Ce qu'il y a dedans

| Région | Lignes | Remarque |
|---|---|---|
| Greater Accra | 32 | Valeur `Greater Accra` (pas `Accra East` ou `Accra West` comme dans les autres fichiers). Elle regroupe l'Est et l'Ouest. À uniformiser avant d'importer |
| Tema | 22 | |
| Central | 20 | Hors Grand Accra |
| Eastern | 11 | Hors Grand Accra |

- **Zones pilotes:** peu de recoupements. Bawaleshie (17 sept., proche d'East Legon), Legon Hills (2 oct.) et Spintex Junction (2 oct.). Aucune de nos 10 zones n'est citée telle quelle.
- **Horaires:** 9h-17h (Grand Accra), 9h-16h ou 9h-15h (Tema, Central, Eastern).
- **Doublon possible:** Abease, Achiama, Obeyeyie, Ayikai et Doblo sont listés le 17 sept. et le 2 oct. Ce sont deux jours différents, donc pas des doublons.
- **Heure de publication suspecte:** 06:58 pour les deux articles, y compris celui du 17 septembre publié le jour même. À vérifier.
- **Mots inventés possibles:** « C& Medical Center » (probablement « C&J Medical Centre »), « Lamgma », « Mawu be ji be ». Ils viennent de la lecture de l'article, à vérifier sur le lien.

---

## Ajout: coupures du 20 mai (agent Meta, étiquetées « 2024 » par erreur)

| Fichier | Lignes | Contenu |
|---|---|---|
| `ecg_annonces_2026_05_20.csv` | 39 | Coupures du mercredi **20 mai 2026**: Accra East (5 lignes), Accra West (6), Tema (13), Central (6), Volta (9) |
| `pages_trouvees_mai_2026.csv` | 3 | ECG sur Facebook, Adom Online, MyJoyOnline |

**Erreur de l'agent corrigée:** l'agent a daté ces coupures de **2024** (« source archive 2024-2025 »). L'article source ([Adom Online](https://www.adomonline.com/gridco-ecg-announce-maintenance-across-4-regions-on-wednesday-may-20/)) est publié le **19 mai 2026 à 19h55** et annonce le **mercredi 20 mai 2026** (le 20 mai 2024 était un lundi). J'ai corrigé les années, l'heure de publication, et je l'ai noté dans la colonne `remarque`. Le fichier brut n'a pas été conservé.

- **Zones pilotes:** aucune. Dzen Ayor, Ability et Haatso (Accra East) sont proches d'Achimota et de Madina mais ne sont pas des zones pilotes.
- **« 37 »** (Accra East): probablement « 37 Military Hospital », à vérifier sur l'article.
- **Type `planned` pour Volta:** le motif dit « emergency maintenance » (GRIDCo, Aflao). Le champ `type` aurait dû être `emergency`.
- **Source = presse, pas Facebook.** Le « 20 annonces » de `pages_trouvees_mai_2026.csv` pour la page Facebook de l'ECG n'est pas vérifiable.
- **Cette date est donc déjà proche de nous** (mai 2026): c'est de la donnée récente utile pour la prédiction.
