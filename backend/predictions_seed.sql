-- LightLink: prévisions générées par prediction/predict.py (ne pas éditer à la main).
-- Modèle rules-v2.0 (méthode 'rules'), jour cible 2026-10-17 (UTC = heure du Ghana).
-- Taux de base estimés sur la fenêtre 2026-10-05 → 2026-10-14 (10 jours).
-- Rejouable sans doublon: les lignes du même modèle et du même jour sont remplacées.
BEGIN;
DELETE FROM public.predictions WHERE method = 'rules' AND model_version = 'rules-v2.0' AND window_start >= '2026-10-17T00:00:00Z' AND window_start < '2026-10-18T00:00:00Z';
INSERT INTO public.predictions
    (zone_id, generated_at, window_start, window_end, probability, confidence, expected_duration_min, hourly_risks, method, model_version)
VALUES
    ('osu', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('labone', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('east-legon', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 6, 33, 480, '[0, 0, 6, 6, 6, 4, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('adabraka', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('cantonments', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('dansoman', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('airport-residential', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('achimota', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('madina', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 9, 33, 480, '[0, 0, 9, 9, 9, 6, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0'),
    ('tema-community-1', NOW(), '2026-10-17T09:00:00Z', '2026-10-17T17:00:00Z', 2, 33, 480, '[0, 0, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0]'::jsonb, 'rules', 'rules-v2.0');
COMMIT;
