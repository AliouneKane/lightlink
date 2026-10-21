# Module de prédiction LightLink (rules-v2.0)

Estime le risque de coupure par quartier et par heure. **Aucune donnée simulée.** Tout vient des annonces officielles de l'ECG rangées dans [data/](../data/README.md) ou d'une étude citée.

```sh
python3 prediction/predict.py                  # prévisions du jour (UTC), écrit backend/predictions_seed.sql
python3 prediction/predict.py --date 2026-10-16
python3 prediction/predict.py --load-shedding  # un régime de délestage national est actif
python3 prediction/backtest.py                 # évaluation leave-one-day-out
python3 -m unittest discover -s prediction/tests -v
```

Python 3.9+ standard, aucune dépendance. Le Ghana est à GMT toute l'année: **heure locale = UTC**.

## Pourquoi pas un Random Forest

La première version (Random Forest, ROC-AUC « > 0,99 ») a été **retirée**: ses étiquettes de coupure étaient fabriquées par des règles écrites en dur (par exemple « groupe A coupé lundi et jeudi »), le modèle ne faisait que réapprendre ces règles. Le PDF officiel de 2023 montre au contraire une rotation A→B→C→D, un groupe par soir. Et nous n'avons que **21 jours de coupures datées**: aucun modèle d'apprentissage ne peut être validé là-dessus ([BILAN_DONNEES](../docs/donnees/BILAN_DONNEES.md)). Un Random Forest redeviendra pertinent avec les mesures nLine ou les signalements des habitants.

## Le modèle

Pour le quartier *z*, le jour *d*, l'heure *h*:

```text
risque = 1 − (1 − annonce)(1 − non_planifié)(1 − délestage)        (événements supposés indépendants)

annonce     = 0,90 × couverture   si une annonce ECG couvre h       (sinon on utilise taux_planifié × f(h))
non_planifié= min(1, taux_non_planifié × 2) × (102 min / 24 h)      (profil horaire plat)
délestage   = 1/3                 seulement avec --load-shedding
```

| Composante | Provenance |
|---|---|
| Annonces (`data/instagram`, `x`, `presse`) | **Donnée.** Une annonce ECG est un fait, pas une prédiction |
| `taux_planifié`, `taux_non_planifié` par quartier | **Donnée**, estimé sur la fenêtre 5→14 oct. 2026 (10 jours × 10 quartiers), lissé par Beta-Binomial vers la moyenne des 10 quartiers |
| Force du lissage `k = 20` | **Choix statistique, peu sensible**: le backtest donne un Brier entre 0,0291 et 0,0295 pour k de 5 à 100 |
| `f(h)` profil des maintenances | **Donnée**: part des fenêtres annoncées qui couvrent l'heure (≈ 9h-17h). Presse: les coupures ECG planifiées vont de 9h à 17h |
| Facteur ×2 sur le non planifié | **Littérature**: Klugman et al. 2021 (IPSN), les capteurs détectent « presque deux fois plus de coupures » que l'ECG n'en observe |
| Durée 102 min | **Littérature**: même étude, durée moyenne de 1,7 h sur 3 123 coupures mesurées à Accra |
| Délestage 1/3 | **Donnée**: 3 groupes, un coupé par bloc de 6 h (avril 2026). L'ordre de rotation n'est pas publié, donc aucun groupe n'est favorisé |
| Annonce fiable à **90 %** | **Proxy**: Eversource (distributeur américain), FAQ « Planned Service Interruptions »: les travaux ont lieu à la date et à l'heure annoncées « environ 90 % du temps ». Aucun chiffre publié pour l'ECG |
| Annonce partielle 0,45 | **Convention**: 0,90 × 0,5, où 0,5 traduit qu'on ignore quelle part du quartier est touchée. Les circuits sont en grille et non par rue (Eversource): un habitant d'une zone nommée n'est pas sûr d'être coupé. **Remplacée par la mesure** des réponses des habitants dès qu'il y en a |

### Paramètres retirés faute de source

- **Poids horaire de nuit (0,7).** Une étude américaine (Load Dependence of Power Outage Statistics, arXiv 1805.07792) trouve que les grosses pannes sont moins sévères la nuit, mais sur 1 193 événements de plus de 50 000 clients, au niveau transport. Ce n'est pas notre échelle. À Accra, les deux grosses pannes nationales de 2026 (29 juillet et 20 août) ont commencé vers 4h15 du matin ([Citi Newsroom](https://www.citinewsroom.com/2026/08/widespread-power-outage-hits-parts-of-ghana-again/)). Les sources se contredisent: le profil horaire du risque non planifié est donc **plat**.
- **Majoration d'orage (×1,5).** Les études donnent des effets relatifs qui dépendent de la région et du type d'événement (chaleur en Chine: +3,9 % de fréquence; événements composés extrêmes aux États-Unis: jusqu'à ×52 pour les pannes de plus de 8 h). Il n'existe pas de multiplicateur universel pour un réseau de distribution comme celui d'Accra. L'option `--storm` a été retirée plutôt que de garder un chiffre inventé.

Toutes les valeurs sont dans la classe `Params` de [lightlink_model.py](lightlink_model.py), avec leur provenance en commentaire.

**Fenêtre d'exposition.** On ne compte les jours « sans coupure » que là où la collecte était systématique (balayage quotidien du compte Instagram de l'ECG, du 5 au 14 octobre 2026). Les fichiers 2025 et mai/juin 2026 ont été collectés *parce qu'une coupure existait*: les inclure fausserait les taux à la hausse.

**Confiance.** `confiance = n / (n + k)`: la part de données réelles dans l'estimation (10 jours, k = 20, donc 33 %). Une annonce ECG donne 90 %. Ce n'est pas une probabilité calibrée, c'est un indicateur de solidité qui reste bas tant qu'on a peu de jours.

## Évaluation

`backtest.py` retire chaque jour tour à tour, estime les taux sur les autres, puis prédit « ce quartier a-t-il une coupure annoncée ce jour-là ? ». Résultat sur les données du 14 octobre 2026:

| Prédicteur | Brier | Log-loss |
|---|---|---|
| quartier seul | 0,0309 | 0,2128 |
| **modèle lissé (k = 20)** | **0,0291** | **0,1319** |
| moyenne commune | 0,0297 | 0,1428 |
| constante (taux global) | 0,0291 | 0,1351 |
| toujours 0 % | 0,0299 | 0,2082 |

Le lissage évite le piège du taux brut (log-loss 0,21), mais **il ne fait pas mieux que la constante au sens de Brier** (IC95 du gain: [−0,0012 ; +0,0015]). Avec **3 événements sur 100 quartier-jours**, les données ne permettent pas de départager les modèles. Le vrai apport est ailleurs: les annonces datées (Madina le 16 octobre: 45 %) et une confiance qui dit honnêtement qu'on sait peu.

## Tentative de vérification par X (16 octobre 2026): non concluante

Nous avons demandé à deux reprises à un agent avec accès à X de retrouver des témoignages d'habitants pour confirmer ou infirmer les paramètres. **Résultat: inexploitable.** Sa matrice quartier × jour (120 cases) ne contenait aucun post, y compris pour Madina le 8 octobre, où une coupure était annoncée par l'ECG. Sur une synthèse sans citation, le test de départ a donné « aucun » pour Madina (8, 14, 16 octobre) et East Legon (9 octobre), donc l'agent ne voit pas assez de posts de quartier pour répondre aux autres questions. Les paramètres « couverture partielle » et « taux de coupures non annoncées » ne sont donc **pas** vérifiés. Seuls des mesures indépendantes (nLine) ou nos propres signalements pourront les calibrer.

À retenir pour le produit: les coupures de quartier laissent très peu de traces publiques sur X. L'application ne pourra pas compter sur les réseaux sociaux pour connaître l'état réel d'un quartier, d'où l'importance des signalements dans l'appli.

## Vérification par sources officielles (17 octobre 2026)

Un second agent, limité aux comptes officiels et à la presse, a rendu des tableaux bruts rangés dans [docs/donnees/verification_x/](../docs/donnees/verification_x/README.md). Après vérification, ils sont consolidés en **un événement par ligne** dans `evenements_verifies.csv`. Règle appliquée: **un fait n'entre que s'il est recoupé par une source lisible** (article ouvert). Un post X seul ne suffit pas, car X n'est pas lisible automatiquement; sa date de publication est vérifiée en la décodant depuis l'identifiant du post.

| Événement | Début | Retour | Échelle |
|---|---|---|---|
| Incendie du poste d'Achimota, 4 mai 2025 | 10:35 | annoncé 14:00, réel 13:20 | distribution (ECG) |
| Panne nationale, 29 juillet 2026 | 03:11 | non publié | transport (GRIDCo) |
| Panne nationale, 20 août 2026 | 04:30 | partiel à 07:02 | transport (GRIDCo) |
| Incendie du poste de Mallam, 14 octobre 2026 | 02:36 | partiel | transport (GRIDCo) |

### Ce que ça change pour le modèle

**Profil horaire.** Trois des quatre événements commencent entre 00h et 06h. Sous un profil plat, la probabilité d'en voir au moins trois sur quatre dans ces 6 heures est 4 × 0,25³ × 0,75 + 0,25⁴ = **0,051**: c'est à la limite du hasard, avec quatre cas seulement. Surtout, trois sont des incidents du **réseau de transport** (GRIDCo), un autre phénomène que les pannes de quartier du modèle. Le profil reste **plat**: un abattement de nuit est exclu, une majoration de nuit n'est pas démontrée.

**Pannes nationales: une composante à part, non prédite.** Au moins 2 entre le 1er juillet et le 17 octobre 2026 (109 jours): environ **1 tous les 54 jours**, intervalle de confiance exact de Poisson à 95 %: [0,2 % ; 6,6 %] par jour. Elles touchent tous les quartiers en même temps, de nuit, sans annonce, avec une heure de retour jamais publiée. Leur durée étant inconnue, elles ne sont **pas** ajoutées au risque horaire (il faudrait inventer une durée). La bonne réponse produit est la **détection en direct**: la vue `zone_status` voit une panne nationale dès que plusieurs quartiers signalent en même temps.

**Heures de retour annoncées.** Ce sont des prévisions de l'ECG, pas des mesures: le post d'Achimota annonçant « 14:00 » a été publié à 13:04, avant le retour réel de 13:20. Le modèle garde la fenêtre annoncée (c'est l'information disponible) et n'utilise pas ces heures comme durées.

### Les trois paramètres sans source: mesurés par l'application

Aucune source publique ne donne la fiabilité des annonces ECG, la part d'un quartier touchée par une annonce partielle, ni l'heure réelle de retour (deux agents IA et une recherche web n'ont rien trouvé). Aucun calcul ne remplace une donnée absente: **la meilleure option est de les mesurer**. Pendant une fenêtre annoncée, l'application pose une question en un geste aux habitants de la zone: « Avez-vous du courant ? ». Les réponses donnent:

| Paramètre | Mesure | Mise à jour (déjà codée) |
|---|---|---|
| Fiabilité des annonces (prior 0,90, proxy Eversource) | annonces où les habitants confirment la coupure / annonces avec réponses | `announcement_reliability(tenues, observées)`: Beta-Binomial, le prior pèse 10 annonces |
| Annonce partielle (prior 0,45) | habitants coupés / habitants ayant répondu, lors d'annonces « parts of » | `partial_announcement_estimate(coupés, réponses)`, prior de poids 2 |
| Heure réelle de retour | premier signalement `restored` après le début annoncé | à exploiter quand les données existent |

Tant qu'il n'y a pas de mesure, ces fonctions rendent exactement les valeurs actuelles (0,90 et 0,45): rien ne change aujourd'hui. La part de coupés lors d'une annonce partielle mesure à la fois la fiabilité et la couverture: elle est donc estimée directement, et non multipliée par la fiabilité, pour ne pas compter celle-ci deux fois. Avec le prior actuel, la fiabilité réelle a 80 % de chances d'être entre 0,77 et 0,99.

**C'est en place.** La migration `20261017000000_announcement_checks.sql` accepte le signalement `powered` (« j'ai du courant », déjà proposé par le web et le mobile) et crée la vue `announcement_outcomes`: pour chaque annonce, le nombre d'habitants coupés et avec du courant pendant la fenêtre, chacun compté une fois avec sa dernière réponse, sans jamais exposer qui a répondu. Le web et le mobile posent la question dans la carte « Calendrier ECG ». Pour recalibrer:

```sh
# Exporter la vue depuis Supabase (éditeur SQL ou psql), puis:
python3 prediction/predict.py --outcomes announcement_outcomes.csv
```

Annonce complète: tenue si plus d'habitants coupés qu'avec du courant (une égalité ne conclut rien). Annonce partielle: chaque réponse compte. Seules les fenêtres terminées comptent. Chaîne testée de bout en bout (Postgres → export CSV → modèle).

### Délestage: lire le calendrier, pas le deviner

Aucun calendrier de délestage 2026 avec heures n'a été trouvé, ni aucune trace de délestage entre juillet et octobre 2026. Plutôt que de deviner une rotation, le modèle **lit les calendriers datés** dès qu'ils existent dans `data/` (format à 16 colonnes, `type = load_shedding`, avec heures): chaque ligne devient une annonce. C'est testé sur le vrai PDF de 2023 (Madina, groupe A, est à 90 % de risque le 30 mars 2023 à 20h, jour du groupe A). Sans calendrier, `--load-shedding` garde 1/3 (trois groupes, ordre inconnu). Les délestages n'entrent pas dans les taux de base.

### Tema Community 1: groupe D en 2023, inconnu en 2026

Le PDF officiel de l'ECG (2023) le place en **groupe D**, sous deux noms: « Comm. 1 Market » et « Presby Church Comm. 1 Casino ». Une première version du modèle ne le reconnaissait pas, car elle exigeait « Tema » devant « Community »: c'est corrigé et testé (« Lakeside Community 1 & 8 », un autre lieu, reste exclu). En 2026, l'outil 3news n'a pas de page pour Comm. 1 (vérifié le 17 octobre 2026), et le délestage d'avril 2026 n'avait que trois groupes (A, B, C).

**Pourquoi on ne peut pas déduire un groupe des communautés voisines.** L'ECG attribue les groupes par **départ électrique** (feeder): le câble qui alimente un secteur, pas le quartier ni son numéro. Les données le montrent: une même communauté peut relever de deux groupes (Comm. 17 en A et B, Comm. 25 en B et C en 2026), et Comm. 2, 3, 4, 5 tombent dans des groupes différents. Le groupe suit le réseau électrique, dont nous n'avons pas la carte. Sans cette carte, la règle « même groupe que les voisines » serait fausse; le groupe 2026 de Comm. 1 reste donc inconnu, et 1/3 par groupe est la valeur par défaut correcte.

## Limites connues

1. **On ne mesure que ce que l'ECG annonce.** Les petites pannes basse tension ne sont pas publiées (d'où le facteur ×2, une borne basse). Sans mesures indépendantes (nLine, info@nline.io) ou signalements, le risque hors annonce reste faible et peu fiable.
2. **Pannes nationales non prédites** (voir plus haut): environ une tous les 54 jours, gérées par la détection en direct.
3. **Annonces sans quartier** (« parts of Accra ») non rattachées.
4. **Groupes de délestage datés**: les groupes changent d'un plan à l'autre (Adabraka: A, B et D en 2023, A en 2026). La migration `20261017000100_dated_zone_groups.sql` donne à chaque rattachement sa source et sa période de validité; les lignes sont générées depuis `data/` par `build_zone_groups.py` (38 rattachements: 23 pour 2023, 15 pour 2026). Cantonments et Tema Community 1 n'ont pas de groupe 2026 connu.

## Fichiers

| Fichier | Rôle |
|---|---|
| `lightlink_model.py` | Modèle: paramètres, lecture des CSV, taux, risque, SQL |
| `predict.py` | Ligne de commande, génère `backend/predictions_seed.sql` |
| `backtest.py` | Évaluation leave-one-day-out |
| `tests/test_model.py` | 24 tests (appariement des quartiers, taux, recalibrage, risque, calendrier de délestage, contraintes SQL, vraies données) |
| `build_zone_groups.py` | Génère les groupes ECG datés de chaque quartier (section balisée des seeds) |
| `ingest_external_data.py` | Diagnostic: flux presse et météo en direct (non utilisé par le modèle) |

Le SQL produit est **idempotent** (transaction qui remplace les lignes `rules-v2.0` du jour), toutes les heures en UTC avec le suffixe `Z`.
