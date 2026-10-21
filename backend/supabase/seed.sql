-- 10 pilot zones in Accra/Tema. Same ids as shared/energy.ts so the front end maps 1:1.
insert into public.zones (id, name, lat, lng) values
  ('osu', 'Osu', 5.556, -0.182),
  ('labone', 'Labone', 5.571, -0.166),
  ('east-legon', 'East Legon', 5.635, -0.158),
  ('adabraka', 'Adabraka', 5.57, -0.213),
  ('cantonments', 'Cantonments', 5.579, -0.173),
  ('dansoman', 'Dansoman', 5.548, -0.263),
  ('airport-residential', 'Airport Residential', 5.609, -0.189),
  ('achimota', 'Achimota', 5.628, -0.225),
  ('madina', 'Madina', 5.671, -0.165),
  ('tema-community-1', 'Tema Community 1', 5.642, 0.004)
on conflict (id) do nothing;

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

-- BEGIN ecg_schedules (généré par prediction/import_schedules.py, ne pas éditer à la main)
insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind, partial, localities, source_url) values
  ('achimota', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', true, 'New Achimota Station', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('achimota', '2023-04-01T18:00:00Z', '2023-04-01T23:00:00Z', 'load_shedding', true, 'Achimota Market', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('achimota', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', true, 'Achimota Police Station, Achimota School, New Achimota', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('achimota', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', true, 'New Achimota Station', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('achimota', '2023-04-05T18:00:00Z', '2023-04-05T23:00:00Z', 'load_shedding', true, 'Achimota Market', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('achimota', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', true, 'Achimota Police Station, Achimota School, New Achimota', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-03-30T18:00:00Z', '2023-03-30T23:00:00Z', 'load_shedding', true, 'Adabraka Free Town', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', false, 'Adabraka', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', false, 'Adabraka', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-04-03T18:00:00Z', '2023-04-03T23:00:00Z', 'load_shedding', true, 'Adabraka Free Town', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', false, 'Adabraka', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', false, 'Adabraka', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('adabraka', '2023-04-07T18:00:00Z', '2023-04-07T23:00:00Z', 'load_shedding', true, 'Adabraka Free Town', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-03-30T18:00:00Z', '2023-03-30T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-04-01T18:00:00Z', '2023-04-01T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-04-03T18:00:00Z', '2023-04-03T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-04-05T18:00:00Z', '2023-04-05T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('airport-residential', '2023-04-07T18:00:00Z', '2023-04-07T23:00:00Z', 'load_shedding', true, 'Airport Residential Area', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('cantonments', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', true, 'East Cantonments', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('cantonments', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', false, 'Cantonments', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('cantonments', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', true, 'East Cantonments', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('cantonments', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', false, 'Cantonments', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', true, 'Dansoman SSNIT Flats', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2023-04-01T18:00:00Z', '2023-04-01T23:00:00Z', 'load_shedding', false, 'Dansoman, Dansoman Keep Fit', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', true, 'Dansoman Last Stop', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', true, 'Dansoman SSNIT Flats', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2023-04-05T18:00:00Z', '2023-04-05T23:00:00Z', 'load_shedding', false, 'Dansoman, Dansoman Keep Fit', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', true, 'Dansoman Last Stop', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('dansoman', '2025-05-18T09:00:00Z', '2025-05-18T16:00:00Z', 'planned', false, 'Dansoman', 'https://x.com/ECGghOfficial/status/1922946329862402550'),
  ('east-legon', '2023-03-30T18:00:00Z', '2023-03-30T23:00:00Z', 'load_shedding', false, 'East Legon', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('east-legon', '2023-04-03T18:00:00Z', '2023-04-03T23:00:00Z', 'load_shedding', false, 'East Legon', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('east-legon', '2023-04-07T18:00:00Z', '2023-04-07T23:00:00Z', 'load_shedding', false, 'East Legon', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('east-legon', '2026-10-09T09:00:00Z', '2026-10-09T17:00:00Z', 'planned', true, 'Parts of East Legon', 'https://www.instagram.com/p/DeFE0fdlm8l/'),
  ('labone', '2023-03-30T18:00:00Z', '2023-03-30T23:00:00Z', 'load_shedding', false, 'Labone', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('labone', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', false, 'Labone, Labone Police Barracks, Labone SHS', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('labone', '2023-04-03T18:00:00Z', '2023-04-03T23:00:00Z', 'load_shedding', false, 'Labone', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('labone', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', false, 'Labone, Labone Police Barracks, Labone SHS', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('labone', '2023-04-07T18:00:00Z', '2023-04-07T23:00:00Z', 'load_shedding', false, 'Labone', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('madina', '2023-03-30T18:00:00Z', '2023-03-30T23:00:00Z', 'load_shedding', false, 'Madina', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('madina', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', true, 'Madina Zongo Junction', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('madina', '2023-04-03T18:00:00Z', '2023-04-03T23:00:00Z', 'load_shedding', false, 'Madina', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('madina', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', true, 'Madina Zongo Junction', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('madina', '2023-04-07T18:00:00Z', '2023-04-07T23:00:00Z', 'load_shedding', false, 'Madina', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('madina', '2026-10-08T09:00:00Z', '2026-10-08T17:00:00Z', 'planned', false, 'Madina', 'https://www.instagram.com/p/DeFE0fdlm8l/'),
  ('madina', '2026-10-14T09:00:00Z', '2026-10-14T17:00:00Z', 'planned', true, 'Madina Washington, UN Madina', 'https://www.instagram.com/p/DeTcGjGALAs/'),
  ('madina', '2026-10-16T09:00:00Z', '2026-10-16T17:00:00Z', 'planned', true, 'Parts of Madina', 'https://www.instagram.com/p/DeTcGjGALAs/'),
  ('osu', '2023-03-31T18:00:00Z', '2023-03-31T23:00:00Z', 'load_shedding', true, 'Osu Oxford Street', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('osu', '2023-04-01T18:00:00Z', '2023-04-01T23:00:00Z', 'load_shedding', true, 'Osu Oxford Street', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('osu', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', true, 'Osu Police Station', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('osu', '2023-04-04T18:00:00Z', '2023-04-04T23:00:00Z', 'load_shedding', true, 'Osu Oxford Street', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('osu', '2023-04-05T18:00:00Z', '2023-04-05T23:00:00Z', 'load_shedding', true, 'Osu Oxford Street', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('osu', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', true, 'Osu Police Station', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('tema-community-1', '2023-04-02T18:00:00Z', '2023-04-02T23:00:00Z', 'load_shedding', true, 'Comm. 1 Market, Presby Church Comm. 1 Casino', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf'),
  ('tema-community-1', '2023-04-06T18:00:00Z', '2023-04-06T23:00:00Z', 'load_shedding', true, 'Comm. 1 Market, Presby Church Comm. 1 Casino', 'https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf')
on conflict (zone_id, starts_at, ends_at, kind) do nothing;
-- END ecg_schedules
