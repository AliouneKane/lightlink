import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import lightlink_model as m  # noqa: E402


def ann(zone, day, kind="planned", start=540, end=1020, partial=False):
    return m.Announcement(zone, date.fromisoformat(day), kind, start, end, partial)


PROFILE = [1.0 if 9 <= h < 17 else 0.0 for h in range(24)]
RATES = m.ZoneRates(plan=0.05, unplanned=0.01, days=10, plan_events=1, unplanned_events=0)


class ZoneMatching(unittest.TestCase):
    def test_exact_and_partial(self):
        self.assertEqual(m.match_zone("Madina"), ("madina", False))
        self.assertEqual(m.match_zone("Parts of Madina"), ("madina", True))
        self.assertEqual(m.match_zone("Madina Estate and its environs"), ("madina", True))
        self.assertEqual(m.match_zone("Parts of East Legon"), ("east-legon", True))
        # Écriture du PDF ECG 2023 pour Tema Community 1 (groupe D).
        self.assertEqual(m.match_zone("Comm. 1 Market"), ("tema-community-1", True))
        self.assertEqual(m.match_zone("Presby Church Comm. 1 Casino"), ("tema-community-1", True))
        self.assertEqual(m.match_zone("Tema Community 1"), ("tema-community-1", False))

    def test_no_false_positive(self):
        self.assertIsNone(m.match_zone("Lakeside Community 1 and 8"))  # pas Tema Community 1
        self.assertIsNone(m.match_zone("Lakeside Community 1 & 8"))
        self.assertIsNone(m.match_zone("Comm. 10"))
        self.assertIsNone(m.match_zone("Comm 17"))
        self.assertIsNone(m.match_zone("Posuban"))  # contient « osu » mais pas le mot
        self.assertIsNone(m.match_zone(""))


class Rates(unittest.TestCase):
    def test_shrinkage_between_zone_and_pooled(self):
        pooled = 0.03
        self.assertAlmostEqual(m.shrunk_rate(0, 10, pooled, 20), (20 * pooled) / 30)
        zone = m.shrunk_rate(3, 10, pooled, 20)
        self.assertGreater(zone, pooled)
        self.assertLess(zone, 0.3)  # le taux brut 3/10 est ramené vers la moyenne

    def test_more_data_less_shrinkage(self):
        self.assertGreater(m.shrunk_rate(30, 100, 0.03, 20), m.shrunk_rate(3, 10, 0.03, 20))

    def test_holdout_removes_the_day(self):
        window = m.ExposureWindow(date(2026, 10, 5), date(2026, 10, 14))
        a = [ann("madina", "2026-10-08")]
        full = m.estimate_rates(a, window)["madina"]
        held = m.estimate_rates(a, window, holdout=date(2026, 10, 8))["madina"]
        self.assertEqual((full.plan_events, held.plan_events, held.days), (1, 0, 9))


class Updates(unittest.TestCase):
    """Les paramètres sans source se mettent à jour avec les mesures LightLink."""

    def test_reliability_starts_at_proxy_and_follows_data(self):
        self.assertAlmostEqual(m.announcement_reliability(0, 0), 0.90)
        self.assertAlmostEqual(m.PARAMS.announced_active_p, m.announcement_reliability(0, 0))
        self.assertAlmostEqual(m.announcement_reliability(10, 20), (9 + 10) / 30)
        self.assertLess(abs(m.announcement_reliability(500, 1000) - 0.5), 0.01)  # les données dominent

    def test_partial_prior_is_reliability_times_half(self):
        self.assertAlmostEqual(m.partial_announcement_estimate(0, 0), 0.45)
        self.assertAlmostEqual(m.PARAMS.announced_partial_p, 0.45)
        self.assertAlmostEqual(m.partial_announcement_estimate(8, 10), (0.9 + 8) / 12)

    def test_calibrate_from_outcomes_view(self):
        rows = [
            # complète, terminée: 2 coupés contre 1 → tenue
            {"partial": "f", "residents_cut": "2", "residents_powered": "1", "finished": "t"},
            # complète: 0 coupé contre 3 → non tenue
            {"partial": "false", "residents_cut": "0", "residents_powered": "3", "finished": "true"},
            # égalité: non concluante; sans réponse: ignorée; en cours: ignorée
            {"partial": "f", "residents_cut": "1", "residents_powered": "1", "finished": "t"},
            {"partial": "f", "residents_cut": "0", "residents_powered": "0", "finished": "t"},
            {"partial": "f", "residents_cut": "5", "residents_powered": "0", "finished": "f"},
            # partielle: 1 coupé sur 3 réponses
            {"partial": "t", "residents_cut": "1", "residents_powered": "2", "finished": "t"},
        ]
        params, summary = m.calibrate(rows)
        self.assertEqual(summary, {"held": 1, "observed": 2, "cut": 1, "answered": 3})
        self.assertAlmostEqual(params.announced_active_p, (9 + 1) / 12)
        self.assertAlmostEqual(params.announced_partial_p, (0.9 + 1) / 5)

    def test_calibrate_without_answers_changes_nothing(self):
        params, _ = m.calibrate([])
        self.assertEqual(params, m.PARAMS)


class Risk(unittest.TestCase):
    def test_announcement_dominates(self):
        r = m.hourly_risk("madina", date(2026, 10, 16), RATES, [ann("madina", "2026-10-16")], PROFILE)
        self.assertGreaterEqual(r[10], 0.90)
        self.assertLess(r[3], 0.05)

    def test_partial_announcement_is_weaker(self):
        full = m.hourly_risk("madina", date(2026, 10, 16), RATES, [ann("madina", "2026-10-16")], PROFILE)[10]
        part = m.hourly_risk("madina", date(2026, 10, 16), RATES, [ann("madina", "2026-10-16", partial=True)], PROFILE)[10]
        self.assertAlmostEqual(part, 0.45, delta=0.02)
        self.assertLess(part, full)

    def test_other_zone_or_day_not_affected(self):
        base = m.hourly_risk("osu", date(2026, 10, 16), RATES, [], PROFILE)
        other = m.hourly_risk("osu", date(2026, 10, 16), RATES, [ann("madina", "2026-10-16"), ann("osu", "2026-10-17")], PROFILE)
        self.assertEqual(base, other)

    def test_load_shedding_increases_risk(self):
        base = m.hourly_risk("osu", date(2026, 10, 16), RATES, [], PROFILE)
        ls = m.hourly_risk("osu", date(2026, 10, 16), RATES, [], PROFILE, load_shedding=True)
        self.assertTrue(all(b >= a for a, b in zip(base, ls)))
        self.assertGreater(min(ls), 0.33)

    def test_probabilities_in_unit_interval(self):
        for ls in (False, True):
            r = m.hourly_risk("osu", date(2026, 10, 16), RATES, [ann("osu", "2026-10-16")], PROFILE, load_shedding=ls)
            self.assertTrue(all(0.0 <= x <= 1.0 for x in r))

    def test_unannounced_risk_is_flat_across_hours(self):
        r = m.hourly_risk("osu", date(2026, 10, 16), RATES, [], [0.0] * 24)
        self.assertEqual(len(set(r)), 1)


class Prediction(unittest.TestCase):
    def test_shape_and_db_constraints(self):
        p = m.predict_zone("madina", date(2026, 10, 16), RATES, [ann("madina", "2026-10-16")], PROFILE)
        self.assertEqual(len(p.hourly_risks), 12)
        self.assertTrue(0 <= p.probability <= 100 and 0 <= p.confidence <= 100)
        self.assertGreater(p.window_end, p.window_start)
        self.assertGreaterEqual(p.expected_duration_min, 0)
        self.assertTrue(p.announced)
        self.assertEqual(p.method, "rules")
        self.assertLessEqual(len(p.model_version), 20)  # VARCHAR(20) dans schema.sql

    def test_confidence_low_without_announcement(self):
        p = m.predict_zone("osu", date(2026, 10, 16), RATES, [], PROFILE)
        self.assertFalse(p.announced)
        self.assertLess(p.confidence, 50)


class RealData(unittest.TestCase):
    """Garde-fous sur les vrais CSV du dépôt."""

    @classmethod
    def setUpClass(cls):
        cls.rows = m.load_rows()
        cls.window = m.exposure_window(cls.rows)
        cls.anns = m.parse_announcements(cls.rows)

    def test_window_is_the_instagram_scan(self):
        self.assertEqual(self.window.start, date(2026, 10, 5))
        self.assertGreaterEqual(len(self.window.days), 10)

    def test_known_real_events_are_found(self):
        found = {(a.zone_id, a.day.isoformat()) for a in self.anns}
        for expected in [("madina", "2026-10-08"), ("madina", "2026-10-14"), ("east-legon", "2026-10-09")]:
            self.assertIn(expected, found)

    def test_planned_profile_is_daytime(self):
        prof = m.planned_hour_profile(self.rows)
        self.assertGreater(prof[12], 0.9)
        self.assertLess(prof[3], 0.05)
        self.assertLess(prof[20], 0.05)

    def test_dated_load_shedding_calendar_is_read(self):
        # PDF ECG 2023: groupe A coupé le 30 mars 18h-23h, Madina en groupe A, groupe B le lendemain.
        rates = m.ZoneRates(plan=0.0, unplanned=0.0, days=10, plan_events=0, unplanned_events=0)
        profile = [0.0] * 24
        thursday = m.hourly_risk("madina", date(2023, 3, 30), rates, self.anns, profile)
        self.assertGreaterEqual(thursday[20], 0.85)
        self.assertLess(thursday[12], 0.01)

    def test_load_shedding_not_counted_in_rates(self):
        rates = m.estimate_rates(self.anns, self.window)
        self.assertEqual(rates["madina"].plan_events + rates["madina"].unplanned_events, 2)  # 8 et 14 octobre

    def test_no_future_leak_in_rates(self):
        rates = m.estimate_rates(self.anns, self.window)
        self.assertTrue(all(r.days == len(self.window.days) for r in rates.values()))


class Sql(unittest.TestCase):
    def test_sql_is_utc_idempotent_and_transactional(self):
        preds, window = m.predict_all(date(2026, 10, 16))
        sql = m.to_sql(preds, date(2026, 10, 16), window)
        self.assertTrue(sql.index("BEGIN;") < sql.index("DELETE FROM") < sql.index("INSERT INTO") < sql.index("COMMIT;"))
        self.assertIn("'2026-10-16T09:00:00Z'", sql)
        self.assertNotIn("T09:00:00'", sql)  # jamais d'horodatage sans fuseau
        self.assertEqual(sql.count("::jsonb"), 10)
        self.assertEqual(sql, m.to_sql(preds, date(2026, 10, 16), window))  # déterministe


if __name__ == "__main__":
    unittest.main()
