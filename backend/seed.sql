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

-- 2. GROUPES ECG DATÉS: section générée en fin de fichier (prediction/build_zone_groups.py).

-- Les prévisions ne sont plus semées à la main (les anciennes valeurs étaient inventées).
-- Elles sont générées depuis les annonces ECG réelles: python3 prediction/predict.py (écrit backend/predictions_seed.sql).

-- BEGIN zone_groups (généré par prediction/build_zone_groups.py, ne pas éditer à la main)
insert into public.ecg_groups (id, label) values
  ('A', 'Groupe A'), ('B', 'Groupe B'), ('C', 'Groupe C'), ('D', 'Groupe D')
on conflict (id) do nothing;

-- Sans groupe 2026 connu (absents de 3news): cantonments, tema-community-1.
insert into public.zone_groups (zone_id, group_id, is_partial, source, valid_from, valid_to) values
  ('osu', 'A', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Osu Anglican, Osu Oxford Street
  ('osu', 'B', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Osu Entertainement
  ('labone', 'B', false, '3news_2026', '2026-04-25', '2026-05-01'),  -- Labone, Labone GNTC
  ('east-legon', 'A', false, '3news_2026', '2026-04-25', '2026-05-01'),  -- East Legon
  ('east-legon', 'C', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- East Legon Hills
  ('adabraka', 'A', false, '3news_2026', '2026-04-25', '2026-05-01'),  -- Adabraka, Adabraka Free Town, Adabraka Methodist
  ('dansoman', 'A', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Dansoman SSNIT Flats
  ('dansoman', 'B', false, '3news_2026', '2026-04-25', '2026-05-01'),  -- Dansoman, Dansoman Keep Fit
  ('dansoman', 'C', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Dansoman Beach Road, Dansoman Last Stop
  ('airport-residential', 'A', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Airport Residential Area
  ('achimota', 'A', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- New Achimota Station
  ('achimota', 'B', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Achimota Halt Tower, Achimota Market
  ('achimota', 'C', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Achimota Police Station, Achimota School, New Achimota
  ('madina', 'A', false, '3news_2026', '2026-04-25', '2026-05-01'),  -- Madina, Madina Estate and its environs, Madina Market, Madina Mosque
  ('madina', 'C', true, '3news_2026', '2026-04-25', '2026-05-01'),  -- Madina Social Welfare, Madina Zongo Junction
  ('osu', 'B', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Osu Oxford Street
  ('osu', 'C', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Osu Oxford Street
  ('osu', 'D', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Osu Police Station
  ('labone', 'A', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Labone
  ('labone', 'B', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Labone, Labone Police Barracks, Labone SHS
  ('east-legon', 'A', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- East Legon
  ('adabraka', 'A', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Adabraka Free Town
  ('adabraka', 'B', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Adabraka
  ('adabraka', 'D', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Adabraka
  ('cantonments', 'B', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- East Cantonments
  ('cantonments', 'D', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Cantonments
  ('dansoman', 'B', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Dansoman SSNIT Flats
  ('dansoman', 'C', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Dansoman, Dansoman Keep Fit
  ('dansoman', 'D', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Dansoman Last Stop
  ('airport-residential', 'A', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Airport Residential Area
  ('airport-residential', 'C', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Airport Residential Area
  ('airport-residential', 'D', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Airport Residential Area
  ('achimota', 'B', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- New Achimota Station
  ('achimota', 'C', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Achimota Market
  ('achimota', 'D', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Achimota Police Station, Achimota School, New Achimota
  ('madina', 'A', false, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Madina
  ('madina', 'B', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07'),  -- Madina Zongo Junction
  ('tema-community-1', 'D', true, 'ecg_pdf_2023', '2023-03-30', '2023-04-07')  -- Comm. 1 Market, Presby Church Comm. 1 Casino
on conflict (zone_id, group_id, source) do nothing;
-- END zone_groups
