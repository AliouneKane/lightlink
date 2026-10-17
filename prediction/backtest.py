"""
LightLink - Backtest leave-one-day-out du taux de base.

Pour chaque jour de la fenêtre d'exposition, on retire ce jour, on estime les taux sur les
autres jours, puis on prédit « le quartier Z a-t-il une coupure annoncée ce jour-là ? ».
On compare le modèle à des références simples avec le score de Brier et la log-loss
(plus bas = mieux). Avec si peu d'événements, ce test sert à vérifier que le lissage
n'est pas pire qu'une référence triviale, pas à vanter une performance.

    python3 prediction/backtest.py
"""

import random

from lightlink_model import (
    PARAMS,
    ZONES,
    brier,
    estimate_rates,
    exposure_window,
    load_rows,
    log_loss,
    parse_announcements,
    pooled_rate,
)


def evaluate(prior_strength: float, announcements, window):
    params = type(PARAMS)(prior_strength=prior_strength)
    pairs = []
    for day in window.days:
        rates = estimate_rates(announcements, window, params, holdout=day)
        hit = {(a.zone_id) for a in announcements if a.day == day}
        for z in ZONES:
            p = rates[z].plan + rates[z].unplanned - rates[z].plan * rates[z].unplanned
            pairs.append((p, int(z in hit)))
    return pairs


def main() -> None:
    rows = load_rows()
    window = exposure_window(rows)
    announcements = parse_announcements(rows)
    in_window = [a for a in announcements if window.start <= a.day <= window.end]
    days = len(window.days)
    events = len({(a.zone_id, a.day) for a in in_window})
    print(f"Fenêtre {window.start} → {window.end}: {days} jours × {len(ZONES)} quartiers = {days * len(ZONES)} quartier-jours")
    print(f"Quartier-jours avec coupure annoncée: {events}\n")

    results = {}
    for label, k in (("quartier seul (k=0)", 1e-9), (f"modèle lissé (k={PARAMS.prior_strength:g})", PARAMS.prior_strength), ("moyenne commune (k=∞)", 1e9)):
        results[label] = evaluate(k, announcements, window)
    base = pooled_rate(events, days * len(ZONES))
    results["constante = taux global"] = [(base, y) for _, y in results["moyenne commune (k=∞)"]]
    results["toujours 0 %"] = [(0.001, y) for _, y in results["moyenne commune (k=∞)"]]

    print(f"{'prédicteur':<30}{'Brier':>9}{'log-loss':>10}")
    for label, pairs in results.items():
        print(f"{label:<30}{brier(pairs):>9.4f}{log_loss(pairs):>10.4f}")

    # Incertitude du score: rééchantillonnage bootstrap des quartier-jours (graine fixe, reproductible).
    rng = random.Random(42)
    smoothed = results[f"modèle lissé (k={PARAMS.prior_strength:g})"]
    ref = results["constante = taux global"]
    diffs = []
    for _ in range(2000):
        idx = [rng.randrange(len(smoothed)) for _ in smoothed]
        diffs.append(brier([ref[i] for i in idx]) - brier([smoothed[i] for i in idx]))
    diffs.sort()
    print(f"\nGain de Brier du modèle lissé vs constante: IC95 bootstrap [{diffs[50]:+.4f}, {diffs[1949]:+.4f}] (>0 = le modèle fait mieux)")
    print("Lecture: si l'intervalle contient 0, les données ne permettent pas de départager. C'est attendu avec si peu de jours.")


if __name__ == "__main__":
    main()
