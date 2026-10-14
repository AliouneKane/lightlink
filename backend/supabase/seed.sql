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
