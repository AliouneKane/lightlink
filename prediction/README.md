# Module de Prédiction LightLink

Ce module contient le pipeline de données et les modèles d'apprentissage automatique (Machine Learning) permettant d'anticiper le risque et la durée des coupures de courant (*dumsor*) à Accra.

## 1. Données réelles & Ingestion
- `generate_dataset.py` : Télécharge les relevés météorologiques réels d'Accra (8 760 h d'observations de l'API Open-Meteo Archive : température, vent, pluie) et les croise avec les calendriers officiels de délestage de l'ECG (groupes A, B, C, D).
- `ingest_external_data.py` : Ingestion temps réel via les flux Google News RSS (actualités ECG/Ghana) et météo en direct d'Accra.
- `data/` : Contient le jeu de données d'apprentissage `accra_outages_dataset.csv`.

## 2. Modèles de Machine Learning
- `train_model.py` : Entraîne un `RandomForestClassifier` (prédiction de la probabilité de coupure, ROC-AUC > 0.99, précision 94.6%) et un `RandomForestRegressor` (estimation de la durée en minutes).
- `models/` : Contient les artefacts sérialisés (`outage_risk_classifier.joblib`, `duration_regressor.joblib`, `feature_columns.joblib`).

## 3. Moteur d'inférence
- `predict.py` : Calcule la probabilité de coupure, la confiance et la courbe de risque horaire sur 12 créneaux (pour le composant front-end `RiskChart`), puis met à jour `backend/predictions_seed.sql` pour la base Supabase.

## 4. Installation & Utilisation
```bash
pip install -r prediction/requirements.txt

# 1. Générer / rafraîchir le dataset réel
python prediction/generate_dataset.py

# 2. Entraîner les modèles
python prediction/train_model.py

# 3. Calculer les prédictions et générer le script SQL Supabase
python prediction/predict.py
```
