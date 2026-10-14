-- ==============================================================================
-- LIGHTLINK - PRÉDICTIONS GÉNÉRÉES PAR MODÈLE SUR DONNÉES RÉELLES
-- Horodatage : 2026-10-14 23:10:33 UTC
-- Modèle : Random Forest v1.1-real (Relevés Open-Meteo & Calendrier ECG)
-- ==============================================================================

INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'osu',
    NOW(),
    '2026-10-14T17:00:00',
    '2026-10-14T19:00:00',
    49,
    84,
    120,
    '[0, 0, 0, 22, 21, 21, 26, 49, 49, 49, 49, 27]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'labone',
    NOW(),
    '2026-10-14T19:00:00',
    '2026-10-14T22:00:00',
    22,
    79,
    180,
    '[0, 0, 0, 16, 16, 16, 17, 21, 21, 22, 22, 18]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'east-legon',
    NOW(),
    '2026-10-14T17:00:00',
    '2026-10-14T20:00:00',
    19,
    78,
    180,
    '[1, 1, 1, 17, 16, 16, 16, 19, 19, 18, 18, 16]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'adabraka',
    NOW(),
    '2026-10-14T17:00:00',
    '2026-10-14T20:00:00',
    65,
    88,
    180,
    '[5, 5, 5, 43, 45, 45, 46, 65, 65, 62, 62, 46]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'cantonments',
    NOW(),
    '2026-10-14T11:00:00',
    '2026-10-14T13:00:00',
    17,
    78,
    120,
    '[1, 1, 1, 17, 16, 16, 14, 17, 17, 17, 17, 15]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'dansoman',
    NOW(),
    '2026-10-14T19:00:00',
    '2026-10-14T21:00:00',
    41,
    83,
    120,
    '[0, 0, 0, 20, 21, 21, 23, 38, 38, 41, 41, 24]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'airport-residential',
    NOW(),
    '2026-10-14T17:00:00',
    '2026-10-14T20:00:00',
    21,
    79,
    180,
    '[1, 1, 1, 17, 17, 17, 17, 21, 21, 20, 20, 17]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'achimota',
    NOW(),
    '2026-10-14T19:00:00',
    '2026-10-14T21:00:00',
    43,
    83,
    120,
    '[1, 1, 1, 21, 23, 23, 26, 42, 42, 43, 43, 25]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'madina',
    NOW(),
    '2026-10-14T19:00:00',
    '2026-10-14T22:00:00',
    21,
    79,
    180,
    '[1, 1, 1, 17, 17, 17, 17, 20, 20, 21, 21, 18]'::JSONB,
    'random_forest',
    'v1.1-real'
);
INSERT INTO public.predictions (
    zone_id, generated_at, window_start, window_end,
    probability, confidence, expected_duration_min,
    hourly_risks, method, model_version
) VALUES (
    'tema-community-1',
    NOW(),
    '2026-10-14T11:00:00',
    '2026-10-14T13:00:00',
    3,
    75,
    120,
    '[0, 0, 0, 3, 2, 2, 1, 0, 0, 0, 0, 1]'::JSONB,
    'random_forest',
    'v1.1-real'
);
