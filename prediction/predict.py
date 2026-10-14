"""
LightLink - Moteur d'Inférence et de Prédiction
Génère les prédictions prêtes pour le Front-End (RiskChart + KPIs) et la base Supabase,
en s'appuyant sur le modèle entraîné avec les observations réelles.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

ZONE_GROUPS = {
    'osu': 'B', 'labone': 'A', 'east-legon': 'A', 'adabraka': 'C',
    'cantonments': 'A', 'dansoman': 'B', 'airport-residential': 'A',
    'achimota': 'B', 'madina': 'A', 'tema-community-1': 'D'
}

CHART_HOURS = [6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 23] # 12 créneaux du RiskChart

def load_models():
    clf_path = os.path.join(MODELS_DIR, "outage_risk_classifier.joblib")
    reg_path = os.path.join(MODELS_DIR, "duration_regressor.joblib")
    feat_path = os.path.join(MODELS_DIR, "feature_columns.joblib")

    if not all(os.path.exists(p) for p in [clf_path, reg_path, feat_path]):
        raise FileNotFoundError("Les modèles ne sont pas encore entraînés. Exécutez d'abord train_model.py.")

    clf = joblib.load(clf_path)
    reg = joblib.load(reg_path)
    features = joblib.load(feat_path)
    return clf, reg, features

def predict_zone(zone_id, target_date=None, rain_mm=0.0, temp_c=28.0, wind_kmh=12.0):
    """
    Calcule les prédictions complètes pour un quartier à une date donnée.
    """
    if target_date is None:
        target_date = datetime.now()

    clf, reg, feature_cols = load_models()
    group = ZONE_GROUPS.get(zone_id, 'A')

    hourly_risks = []
    hourly_durations = []

    for h in CHART_HOURS:
        is_peak = 1 if 18 <= h <= 22 else 0
        is_storm = 1 if (rain_mm > 5.0 or wind_kmh > 35.0) else 0

        row = {
            'month': target_date.month,
            'day_of_week': target_date.weekday(),
            'hour': h,
            'is_peak_hour': is_peak,
            'is_weekend': 1 if target_date.weekday() in [5, 6] else 0,
            'temperature_c': temp_c,
            'rain_mm': rain_mm,
            'wind_speed_kmh': wind_kmh,
            'is_storm': is_storm
        }
        # One-hot encoding colonnes
        for col in feature_cols:
            if col.startswith('zone_id_'):
                row[col] = 1 if col == f"zone_id_{zone_id}" else 0
            elif col.startswith('ecg_group_'):
                row[col] = 1 if col == f"ecg_group_{group}" else 0

        df_row = pd.DataFrame([row])
        # S'assurer que toutes les colonnes requises sont présentes
        for col in feature_cols:
            if col not in df_row.columns:
                df_row[col] = 0
        df_row = df_row[feature_cols]

        prob = int(round(clf.predict_proba(df_row)[0, 1] * 100))
        dur = int(round(reg.predict(df_row)[0]))

        hourly_risks.append(prob)
        hourly_durations.append(dur)

    peak_idx = int(np.argmax(hourly_risks))
    peak_prob = hourly_risks[peak_idx]
    peak_hour = CHART_HOURS[peak_idx]
    peak_dur = max(60, hourly_durations[peak_idx])

    window_start = target_date.replace(hour=max(0, peak_hour - 1), minute=0, second=0, microsecond=0)
    window_end = window_start + timedelta(minutes=peak_dur)
    confidence = int(np.clip(75 + (peak_prob * 0.20), 70, 96))

    return {
        'zone_id': zone_id,
        'target_date': target_date.strftime("%Y-%m-%d"),
        'peak_hour': peak_hour,
        'window_start': window_start.isoformat(),
        'window_end': window_end.isoformat(),
        'window_label': f"{window_start.strftime('%H:%M')} – {window_end.strftime('%H:%M')}",
        'probability': peak_prob,
        'confidence': confidence,
        'expected_duration_min': peak_dur,
        'duration_label': f"{peak_dur // 60} h {peak_dur % 60:02d} min" if peak_dur % 60 else f"{peak_dur // 60} h",
        'hourly_risks': hourly_risks,
        'method': 'random_forest',
        'model_version': 'v1.1-real'
    }

def generate_all_predictions_sql():
    """
    Génère les requêtes SQL prêtes pour la base Supabase à partir du modèle réel.
    """
    now = datetime.now()
    output_lines = [
        "-- ==============================================================================",
        "-- LIGHTLINK - PRÉDICTIONS GÉNÉRÉES PAR MODÈLE SUR DONNÉES RÉELLES",
        f"-- Horodatage : {now.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "-- Modèle : Random Forest v1.1-real (Relevés Open-Meteo & Calendrier ECG)",
        "-- ==============================================================================\n"
    ]

    print("[*] Calcul des prédictions basées sur les observations réelles...")
    for zone_id in ZONE_GROUPS.keys():
        pred = predict_zone(zone_id, now, rain_mm=0.0, temp_c=27.0, wind_kmh=10.0)
        print(f"    - {zone_id:<20} : Risque {pred['probability']}% | Confiance {pred['confidence']}% | Fenêtre {pred['window_label']}")

        sql = f"""INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    '{pred['zone_id']}',
    NOW(),
    '{pred['window_start']}',
    '{pred['window_end']}',
    {pred['probability']},
    {pred['confidence']},
    {pred['expected_duration_min']},
    '{json.dumps(pred['hourly_risks'])}'::JSONB,
    '{pred['method']}',
    '{pred['model_version']}'
);"""
        output_lines.append(sql)

    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "predictions_seed.sql")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines) + "\n")

    print(f"\n[+] Script SQL mis à jour avec succès : {output_path}")

if __name__ == "__main__":
    generate_all_predictions_sql()
