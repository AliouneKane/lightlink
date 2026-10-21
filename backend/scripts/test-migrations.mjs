// Applies every migration and the seed to an in-memory Postgres (PGlite), without Docker,
// then checks the behaviour the app and the prediction model rely on.
// Usage: npm run test:sql   (about 20 MB of dependency instead of the Docker images of Supabase)
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = fileURLToPath(new URL("../supabase/", import.meta.url));
const migrations = readdirSync(join(root, "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => join(root, "migrations", file));

const db = new PGlite();
// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create role authenticated;
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create publication supabase_realtime;
`);
for (const file of [...migrations, join(root, "seed.sql")]) {
  await db.exec(readFileSync(file, "utf8"));
}

const user = (n) => `00000000-0000-0000-0000-00000000000${n}`;
for (const n of [1, 2, 3, 4]) {
  await db.query("insert into auth.users (id) values ($1)", [user(n)]);
}
const report = (n, zone, kind, at) =>
  db.query(
    "insert into public.outage_reports (user_id, zone_id, kind, created_at) values ($1, $2, $3, $4)",
    [user(n), zone, kind, at],
  );
const rejects = async (sql) =>
  assert.rejects(() => db.exec(sql), undefined, `should be rejected: ${sql}`);

// Report kinds: 'powered' and 'unstable' accepted, anything else rejected.
await rejects(
  `insert into public.outage_reports (user_id, zone_id, kind) values ('${user(1)}', 'osu', 'nonsense')`,
);

// Announcements: a finished full one, a finished partial one, a running one.
await db.exec(`
  insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind, partial) values
    ('madina', '2026-10-08T09:00Z', '2026-10-08T17:00Z', 'planned', false),
    ('madina', '2026-10-16T09:00Z', '2026-10-16T17:00Z', 'planned', true),
    ('osu', now() - interval '1 hour', now() + interval '1 hour', 'fault', false);`);
await report(1, "madina", "powered", "2026-10-08T09:30Z");
await report(1, "madina", "outage", "2026-10-08T10:00Z"); // latest answer of user 1 wins
await report(2, "madina", "outage", "2026-10-08T11:00Z");
await report(3, "madina", "powered", "2026-10-08T12:00Z");
await report(4, "madina", "outage", "2026-10-08T18:00Z"); // after the window
await report(1, "madina", "outage", "2026-10-16T10:00Z");
await report(2, "madina", "powered", "2026-10-16T10:00Z");
await report(3, "madina", "powered", "2026-10-16T10:00Z");
await report(4, "madina", "unstable", "2026-10-16T10:00Z"); // not an answer
const live = new Date().toISOString();
for (const n of [1, 2, 3]) await report(n, "osu", "outage", live);
await report(4, "osu", "powered", live);

const outcomes = (
  await db.query(
    "select zone_id, partial, residents_cut, residents_powered, finished from public.announcement_outcomes order by starts_at",
  )
).rows.map((row) => ({
  ...row,
  residents_cut: Number(row.residents_cut),
  residents_powered: Number(row.residents_powered),
}));
assert.deepEqual(outcomes, [
  { zone_id: "madina", partial: false, residents_cut: 2, residents_powered: 1, finished: true },
  { zone_id: "madina", partial: true, residents_cut: 1, residents_powered: 2, finished: true },
  { zone_id: "osu", partial: false, residents_cut: 3, residents_powered: 1, finished: false },
]);

const osu = (
  await db.query("select status, powered_reports from public.zone_status where zone_id = 'osu'")
).rows[0];
assert.equal(osu.status, "confirmed_outage");
assert.equal(Number(osu.powered_reports), 1);

// Dated load-shedding groups generated from data/.
const sources = (
  await db.query("select source, count(*)::int as n from public.zone_groups group by source order by source")
).rows;
assert.deepEqual(sources.map((row) => row.source), ["3news_2026", "ecg_pdf_2023"]);
assert.ok(sources.every((row) => row.n > 0));
const tema = (
  await db.query("select group_id, source from public.zone_groups where zone_id = 'tema-community-1'")
).rows;
assert.deepEqual(tema, [{ group_id: "D", source: "ecg_pdf_2023" }]);
await rejects(
  "insert into public.zone_groups values ('osu', 'Z', false, 'x', '2026-01-01', '2026-01-02')",
);
await rejects(
  "insert into public.zone_groups values ('osu', 'A', false, 'x', '2026-01-02', '2026-01-01')",
);

await db.close();
console.log(`OK: ${migrations.length} migrations + seed, reports, announcement_outcomes, zone_status, zone_groups`);
