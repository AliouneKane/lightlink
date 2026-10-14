"""
LightLink - Entraînement des modèles de Machine Learning
1. Modèle de classification : Prédiction du risque de coupure (%) -> RandomForestClassifier
2. Modèle de régression : Prédiction de la durée estimée (minutes) -> RandomForestRegressor
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score, confusion_matrix,
    mean_absolute_error, mean_squared_error, r2_score
)

def train():
    data_path = os.path.join(os.path.dirname(__file__), "data", "accra_outages_dataset.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset introuvable à {data_path}. Exécutez d'abord generate_dataset.py.")

    print(f"[*] Chargement du jeu de données : {data_path}")
    df = pd.read_csv(data_path)

    # 1. Feature Engineering
    # Encodage One-Hot pour zone_id et ecg_group
    df_encoded = pd.get_dummies(df, columns=['zone_id', 'ecg_group'], drop_first=False)

    feature_cols = [
        col for col in df_encoded.columns 
        if col not in ['timestamp', 'zone_name', 'is_outage', 'duration_minutes']
    ]

    X = df_encoded[feature_cols]
    y_class = df_encoded['is_outage']
    y_reg = df_encoded['duration_minutes']

    # Séparation train/test (80% train, 20% test)
    X_train, X_test, y_class_train, y_class_test = train_test_split(
        X, y_class, test_size=0.20, random_state=42, stratify=y_class
    )

    print(f"[*] Taille du jeu d'entraînement : {X_train.shape[0]} | Test : {X_test.shape[0]}")
    print(f"[*] Nombre de variables (Features) : {len(feature_cols)}")

    # 2. ENTRAÎNEMENT DU MODÈLE DE CLASSIFICATION (Risque de coupure)
    print("\n" + "="*60)
    print("1. ENTRAÎNEMENT : CLASSIFICATION DU RISQUE DE COUPURE (Random Forest)")
    print("="*60)

    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=10,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_class_train)

    # Évaluation classification
    y_pred_class = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_class_test, y_pred_class)
    roc_auc = roc_auc_score(y_class_test, y_pred_proba)
    f1 = f1_score(y_class_test, y_pred_class)
    cm = confusion_matrix(y_class_test, y_pred_class)

    print(f"    - Accuracy : {acc * 100:.2f}%")
    print(f"    - ROC-AUC Score : {roc_auc:.4f}")
    print(f"    - F1-Score : {f1:.4f}")
    print(f"    - Matrice de confusion :\n{cm}")

    # Feature Importance (Pour argumenter devant le jury)
    importances = pd.Series(clf.feature_importances_, index=feature_cols).sort_values(ascending=False)
    print("\n[*] Top 7 des facteurs les plus prédictifs :")
    for feat, imp in importances.head(7).items():
        print(f"    - {feat:<25} : {imp*100:.1f}% d'impact")

    # 3. ENTRAÎNEMENT DU MODÈLE DE RÉGRESSION (Durée de la coupure)
    print("\n" + "="*60)
    print("2. ENTRAÎNEMENT : ESTIMATION DE LA DURÉE EN MINUTES")
    print("="*60)

    # On entraîne sur les cas où une coupure a eu lieu
    outage_mask = (y_class == 1)
    X_reg = X[outage_mask]
    y_reg_filtered = y_reg[outage_mask]

    X_train_reg, X_test_reg, y_reg_train, y_reg_test = train_test_split(
        X_reg, y_reg_filtered, test_size=0.20, random_state=42
    )

    reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    reg.fit(X_train_reg, y_reg_train)

    y_pred_reg = reg.predict(X_test_reg)
    mae = mean_absolute_error(y_reg_test, y_pred_reg)
    rmse = np.sqrt(mean_squared_error(y_reg_test, y_pred_reg))
    r2 = r2_score(y_reg_test, y_pred_reg)

    print(f"    - Erreur Absolue Moyenne (MAE) : {mae:.1f} minutes")
    print(f"    - Racine de l'Erreur Quadratique (RMSE) : {rmse:.1f} minutes")
    print(f"    - Score R² : {r2:.4f}")

    # 4. SAUVEGARDE DES MODÈLES & ARTEFACTS
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)

    clf_path = os.path.join(models_dir, "outage_risk_classifier.joblib")
    reg_path = os.path.join(models_dir, "duration_regressor.joblib")
    features_path = os.path.join(models_dir, "feature_columns.joblib")

    joblib.dump(clf, clf_path)
    joblib.dump(reg, reg_path)
    joblib.dump(feature_cols, features_path)

    print("\n" + "="*60)
    print("[+] MODÈLES ENREGISTRÉS AVEC SUCCÈS :")
    print(f"    - Classificateur de risque : {clf_path}")
    print(f"    - Régresseur de durée : {reg_path}")
    print(f"    - Colonnes caractéristiques : {features_path}")
    print("="*60)

if __name__ == "__main__":
    train()
