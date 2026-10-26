# La prédiction des coupures

Tâches 104 à 121. Ce que LightLink prédit, comment, avec quelle confiance, et ce que vaut la prédiction mesurée sur des données réelles. Le détail de chaque paramètre et de sa source est dans [prediction/README.md](../prediction/README.md).

## Ce qu'on prédit (104)

Pour chaque quartier pilote et chaque jour :

| Sortie | Exemple | Affichage |
|---|---|---|
| **Créneau probable** | 09:00 – 17:00 | « Coupure probable entre 09:00 et 17:00 (confiance 90 %) » |
| **Risque au plus fort** | 45 % | Graphique heure par heure (06 h à 23 h) |
| **Durée** | 8 h | Déduite du créneau |
| **Confiance** | 90 % | Niveau forte, moyenne ou faible |
| **Ce sur quoi elle repose** | « annonce ECG » ou « taux de base » | Texte d'explication sous le graphique |

## Comment (109, 110)

Un **modèle à règles**, pas un modèle appris : avec 21 jours de coupures datées, aucun modèle d'apprentissage ne peut être validé ([pourquoi pas un Random Forest](../prediction/README.md#pourquoi-pas-un-random-forest), tâche 114 abandonnée).

1. **Annonce ECG ce jour-là** : le risque vaut la fiabilité des annonces (0,90 au départ, puis mesurée par les réponses des habitants à « Avez-vous du courant ? ») pendant la fenêtre annoncée. Une annonce partielle (« Parts of Madina ») compte moins (0,45).
2. **Sinon, taux de base du quartier** : la part des jours où une coupure a été annoncée dans le quartier, sur la seule période surveillée sans trou (5 au 14 octobre 2026), lissée vers la moyenne de tous les quartiers pour ne pas sur-réagir à un seul jour.
3. **Heures** : réparties selon les heures habituelles des maintenances ECG (mesurées : surtout 9 h à 17 h).
4. **Durée** : la longueur du créneau à risque ; une coupure non annoncée sans heure de fin dure par défaut 1 h 42, la durée moyenne mesurée à Accra par l'étude nLine (Klugman et al.).

Les annonces saisies à la main (`data/saisie/`) comptent pour leur jour, mais **pas** pour les taux de base : une saisie manuelle n'est pas une surveillance complète.

## Niveaux de confiance (105, 111, 119)

| Niveau | Seuil | Couleur | Quand |
|---|---|---|---|
| **Forte** | 70 % et plus | Vert | Annonce ECG du jour |
| **Moyenne** | 40 à 69 % | Ambre | Quartier bien observé |
| **Faible** | moins de 40 % | Gris | Peu de jours observés |

**Pas assez de données (119)** : sans annonce ECG et avec une confiance faible, l'app écrit « Estimation : pas assez de données pour ce quartier » au lieu de présenter le chiffre comme sûr. C'est le cas aujourd'hui de la plupart des quartiers (10 jours observés, confiance 33 %).

## Qualité mesurée (115)

Backtest « un jour retiré » sur les 100 quartier-jours de la période surveillée (`python3 prediction/backtest.py`). Plus le score est bas, mieux c'est.

| Prédicteur | Brier | Log-loss |
|---|---|---|
| Quartier seul, sans lissage | 0,0309 | 0,2128 |
| **Modèle LightLink (lissé)** | **0,0291** | **0,1319** |
| Moyenne commune | 0,0297 | 0,1428 |
| Constante = taux global | 0,0291 | 0,1351 |
| Toujours 0 % | 0,0299 | 0,2082 |

**Lecture honnête** : le modèle a la meilleure log-loss (il se trompe le moins lourdement), mais avec 3 quartier-jours de coupure seulement, on ne peut pas dire qu'il bat une simple constante (intervalle de confiance du gain : −0,0012 à +0,0015). La prédiction la plus utile vient des **annonces ECG** ; le taux de base deviendra informatif avec les signalements des habitants.

## Tests (120, 121, 122)

| Test | Où |
|---|---|
| Cas normaux et bizarres : pas de données, annonce seule, annonce partielle, délestage | `prediction/tests/test_model.py` |
| Résultats identiques sur un jeu de données fixe (SQL et instantané de démo générés à l'identique, vérifié par le CI) | `prediction/tests`, contrôle « Generated SQL is up to date » |
| Vitesse : les 10 prévisions en moins de 2 s ; lecture par l'app en 170 ms sur le projet hébergé | `Speed` dans les tests, `npm run test:live` |

## Calcul à l'avance (112, 113, 118)

Chaque matin, le workflow « Daily data import » calcule les prévisions du jour et du lendemain, les écrit dans la table `predictions` (lue par les apps en mode connecté) et prévient les habitants des quartiers où la prévision du lendemain dépasse 50 %.
