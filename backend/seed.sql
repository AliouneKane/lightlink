-- ==============================================================================
-- LIGHTLINK - SEED DATA (DONNÉES INITIALES)
-- Version: 1.0 (Alignée sur le prototype Front-End)
-- ==============================================================================

-- 1. INSERTION DES 10 QUARTIERS PILOTES D'ACCRA
INSERT INTO public.zones (id, name, lat, lng) VALUES
    ('osu', 'Osu', 5.556, -0.182),
    ('labone', 'Labone', 5.571, -0.166),
    ('east-legon', 'East Legon', 5.635, -0.158),
    ('adabraka', 'Adabraka', 5.570, -0.213),
    ('cantonments', 'Cantonments', 5.579, -0.173),
    ('dansoman', 'Dansoman', 5.548, -0.263),
    ('airport-residential', 'Airport Residential', 5.609, -0.189),
    ('achimota', 'Achimota', 5.628, -0.225),
    ('madina', 'Madina', 5.671, -0.165),
    ('tema-community-1', 'Tema Community 1', 5.642, 0.004)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng;

-- 2. INSERTION DES GROUPES DE DÉLESTAGE OFFICIELS ECG
INSERT INTO public.ecg_groups (id, label) VALUES
    ('A', 'Groupe A - Secteur Est & Résidentiel'),
    ('B', 'Groupe B - Secteur Ouest & Périphérie'),
    ('C', 'Groupe C - Centre-Ville & Affaires'),
    ('D', 'Groupe D - Zone Portuaire & Industrielle')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- 3. RATTACHEMENT QUARTIERS <-> GROUPES ECG
INSERT INTO public.zone_groups (zone_id, group_id, is_partial) VALUES
    ('dansoman', 'B', true),
    ('dansoman', 'C', true),
    ('dansoman', 'D', true),
    ('airport-residential', 'A', true),
    ('airport-residential', 'C', true),
    ('airport-residential', 'D', true),
    ('madina', 'A', false),
    ('madina', 'B', true),
    ('osu', 'B', false),
    ('labone', 'A', false),
    ('east-legon', 'A', false),
    ('adabraka', 'C', false),
    ('cantonments', 'A', false),
    ('achimota', 'B', false),
    ('tema-community-1', 'D', false)
ON CONFLICT (zone_id, group_id) DO UPDATE SET is_partial = EXCLUDED.is_partial;

-- 4. INSERTION D'UN EXEMPLE DE PRÉVISION INITIALE (Pour le graphique RiskChart de l'app)
INSERT INTO public.predictions (
    zone_id,
    window_start,
    window_end,
    probability,
    confidence,
    expected_duration_min,
    hourly_risks,
    method,
    model_version
) VALUES
    ('osu', NOW(), NOW() + INTERVAL '3 hours', 82, 92, 150, '[13, 12, 9, 18, 26, 22, 35, 57, 78, 69, 48, 25]'::JSONB, 'rules', 'v1.0'),
    ('madina', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', 75, 84, 180, '[10, 15, 20, 25, 40, 55, 75, 85, 70, 50, 30, 20]'::JSONB, 'rules', 'v1.0'),
    ('east-legon', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 61, 81, 120, '[8, 10, 12, 15, 30, 45, 61, 65, 50, 35, 20, 15]'::JSONB, 'rules', 'v1.0');
