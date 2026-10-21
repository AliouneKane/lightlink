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


class ImportSchedules(unittest.TestCase):
    """Tâches 65-66: import des horaires ECG de data/ dans ecg_schedules."""

    @classmethod
    def setUpClass(cls):
        import import_schedules

        cls.module = import_schedules
        cls.items = import_schedules.schedules()

    def test_only_published_windows_no_invented_hour(self):
        self.assertTrue(self.items)
        for (_, start, end, kind), _item in self.items.items():
            self.assertTrue(start.endswith("Z") and end.endswith("Z"))
            self.assertLess(start, end)
            self.assertIn(kind, ("planned", "emergency", "fault", "load_shedding"))

    def test_known_real_windows(self):
        keys = {(z, s) for z, s, _, _ in self.items}
        self.assertIn(("madina", "2026-10-08T09:00:00Z"), keys)
        self.assertIn(("east-legon", "2026-10-09T09:00:00Z"), keys)
        self.assertIn(("tema-community-1", "2023-04-02T18:00:00Z"), keys)  # PDF ECG, groupe D

    def test_localities_grouped_and_partial_flag(self):
        madina14 = next(v for k, v in self.items.items() if k[0] == "madina" and k[1] == "2026-10-14T09:00:00Z")
        self.assertEqual(madina14["localities"], {"Madina Washington", "UN Madina"})
        self.assertTrue(madina14["partial"])

    def test_sql_is_idempotent_and_deterministic(self):
        sql = self.module.to_sql(self.items)
        self.assertIn("on conflict (zone_id, starts_at, ends_at, kind) do nothing", sql)
        self.assertEqual(sql, self.module.to_sql(self.module.schedules()))


class ManualEntry(unittest.TestCase):
    """Tâche 64: une annonce recopiée dans data/saisie compte comme annonce, pas pour les taux."""

    def test_manual_announcement_raises_the_forecast_without_moving_the_window(self):
        import csv
        import shutil
        import tempfile

        import import_schedules

        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp) / "data"
            shutil.copytree(m.DATA_DIR, data)
            before_window = m.exposure_window(m.load_rows(data))
            before_profile = m.planned_hour_profile(m.load_rows(data))
            path = data / "saisie" / "ecg_annonces.csv"
            with path.open(encoding="utf-8") as handle:
                header = next(csv.reader(handle))
            row = dict.fromkeys(header, "")
            row.update(
                date_coupure="2026-10-27", region_ecg="Accra East", localite="Madina",
                heure_debut="10:00", heure_fin="14:00", type="planned", motif="planned maintenance",
                restauration="non", date_publication="2026-10-25", heure_publication="18:30",
                compte="ECG sur X (@ECGghOfficial)", url_post="https://x.com/ECGghOfficial", source_type="image",
            )
            with path.open("a", encoding="utf-8", newline="") as handle:
                csv.DictWriter(handle, fieldnames=header).writerow(row)

            rows = m.load_rows(data)
            self.assertEqual(m.exposure_window(rows), before_window)
            self.assertEqual(m.planned_hour_profile(rows), before_profile)
            predictions, _ = m.predict_all(date(2026, 10, 27), data_dir=data)
            madina = next(p for p in predictions if p.zone_id == "madina")
            self.assertTrue(madina.announced)
            self.assertGreaterEqual(madina.probability, 80)
            self.assertIn(
                ("madina", "2026-10-27T10:00:00Z", "2026-10-27T14:00:00Z", "planned"),
                import_schedules.schedules(data),
            )

    def test_manual_entry_inside_the_window_leaves_base_rates_alone(self):
        """PAN's review of #8: an Osu entry dated 6 Oct must not raise Osu's rate."""
        import csv
        import shutil
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp) / "data"
            shutil.copytree(m.DATA_DIR, data)
            day = date(2026, 10, 28)
            before = next(p for p in m.predict_all(day, data_dir=data)[0] if p.zone_id == "osu")
            path = data / "saisie" / "ecg_annonces.csv"
            with path.open(encoding="utf-8") as handle:
                header = next(csv.reader(handle))
            row = dict.fromkeys(header, "")
            row.update(
                date_coupure="2026-10-06", region_ecg="Accra West", localite="Osu",
                heure_debut="09:00", heure_fin="17:00", type="planned", restauration="non",
                date_publication="2026-10-05", url_post="https://x.com/ECGghOfficial",
            )
            with path.open("a", encoding="utf-8", newline="") as handle:
                csv.DictWriter(handle, fieldnames=header).writerow(row)
            after = next(p for p in m.predict_all(day, data_dir=data)[0] if p.zone_id == "osu")
            self.assertEqual(after.probability, before.probability)
            self.assertEqual(after.hourly_risks, before.hourly_risks)

    def test_manual_file_follows_the_shared_format(self):
        """The working file may hold entries: check its format, not that it is empty."""
        import csv

        path = m.DATA_DIR / "saisie" / "ecg_annonces.csv"
        reference = m.DATA_DIR / "presse" / "ecg_annonces_2026.csv"
        with path.open(encoding="utf-8-sig") as handle, reference.open(encoding="utf-8-sig") as ref:
            self.assertEqual(next(csv.reader(handle)), next(csv.reader(ref)))
        for row in m.load_rows(m.DATA_DIR, (m.MANUAL_SOURCE,)):
            self.assertRegex(row["date_coupure"], r"^\d{4}-\d{2}-\d{2}$")
            self.assertTrue(row["url_post"].startswith("http"), "every entry links its source")
            for key in ("heure_debut", "heure_fin"):
                self.assertRegex(row[key], r"^([01]\d|2[0-3]):[0-5]\d$")


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
