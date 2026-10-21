"""
LightLink - Génère les prévisions du jour et le SQL Supabase.

    python3 prediction/predict.py                      # aujourd'hui (UTC)
    python3 prediction/predict.py --date 2026-10-16
    python3 prediction/predict.py --load-shedding      # régime de délestage actif
    python3 prediction/predict.py --outcomes reponses.csv  # recalibre avec les réponses des habitants

Sortie: backend/predictions_seed.sql (idempotent, voir to_sql).
"""

import argparse
from datetime import date, datetime, timezone
from pathlib import Path

from lightlink_model import PARAMS, ZONES, calibrate, load_outcomes, predict_all, to_sql

OUTPUT = Path(__file__).resolve().parent.parent / "backend" / "predictions_seed.sql"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--date", type=date.fromisoformat, default=datetime.now(timezone.utc).date(), help="jour cible AAAA-MM-JJ (UTC)")
    parser.add_argument("--load-shedding", action="store_true", help="un régime de délestage national est actif")
    parser.add_argument("--outcomes", type=Path, help="export CSV de la vue Supabase announcement_outcomes")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    params = PARAMS
    if args.outcomes:
        params, summary = calibrate(load_outcomes(args.outcomes))
        print(
            f"Réponses des habitants: {summary['held']}/{summary['observed']} annonces tenues, "
            f"{summary['cut']}/{summary['answered']} coupés lors d'annonces partielles → "
            f"fiabilité {params.announced_active_p:.2f}, annonce partielle {params.announced_partial_p:.2f}"
        )
    predictions, window = predict_all(args.date, params=params, load_shedding=args.load_shedding)
    print(f"Jour cible {args.date} | taux estimés sur {window.start} → {window.end} ({len(window.days)} jours)")
    print(f"{'quartier':<22}{'risque':>7}{'confiance':>10}  {'fenêtre (UTC)':<14}{'base'}")
    for p in predictions:
        span = f"{p.window_start:%H:%M}-{p.window_end:%H:%M}"
        print(f"{ZONES[p.zone_id][0]:<22}{p.probability:>6}%{p.confidence:>9}%  {span:<14}{p.basis}")

    args.output.write_text(to_sql(predictions, args.date, window), encoding="utf-8")
    print(f"\nSQL écrit: {args.output}")


if __name__ == "__main__":
    main()
