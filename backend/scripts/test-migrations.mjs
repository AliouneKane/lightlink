// Applies every migration and the seed to an in-memory Postgres (PGlite), without Docker,
// then checks the behaviour the apps and the prediction model rely on.
// Usage: npm run test:sql   (about 20 MB of dependency instead of the Docker images of Supabase)
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { cliCommand, deleteSql, insertSql, scenario } from "./demo-data.mjs";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const root = fileURLToPath(new URL("../supabase/", import.meta.url));
const migrations = readdirSync(join(root, "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => join(root, "migrations", file));

const db = new PGlite();
// Minimal stand-ins for what Supabase provides: auth schema, API roles, JWT user id, realtime.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create role anon nologin;
  create role authenticated nologin;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create publication supabase_realtime;
`);
for (const file of [...migrations, join(root, "seed.sql")]) {
  await db.exec(readFileSync(file, "utf8"));
}
// Supabase grants table access to its API roles; row level security then decides.
await db.exec(`
  grant usage on schema public, auth to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant execute on all functions in schema public, auth to anon, authenticated;
`);

const user = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
for (let n = 1; n <= 16; n++) {
  await db.query("insert into auth.users (id) values ($1)", [user(n)]);
}
// Fixtures are written as the owner (row level security does not apply).
const report = (n, zone, kind, at, lat = null, lng = null) =>
  db.query(
    "insert into public.outage_reports (user_id, zone_id, kind, created_at, lat, lng) values ($1, $2, $3, $4, $5, $6)",
    [user(n), zone, kind, at, lat, lng],
  );
const rejects = (promise, label) => assert.rejects(promise, undefined, `should be rejected: ${label}`);
const now = new Date().toISOString();
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

// Runs statements as a signed-in user (or anon), the way the apps reach the database.
async function as(n, statements) {
  return db.transaction(async (tx) => {
    await tx.exec(n ? `set local role authenticated` : `set local role anon`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [n ? user(n) : ""]);
    return statements(tx);
  });
}

// --- Report kinds -------------------------------------------------------------------------
await rejects(report(1, "osu", "nonsense", now), "unknown report kind");

// --- Task 53: position checked against the neighbourhood ----------------------------------
await report(1, "madina", "outage", minutesAgo(200), 5.672, -0.166); // inside Madina
await rejects(report(1, "madina", "outage", minutesAgo(200), 5.556, -0.182), "Osu position for Madina");
await rejects(report(1, "madina", "outage", minutesAgo(200), 5.672, null), "latitude without longitude");

// --- Answers to announcements (announcement_outcomes) -------------------------------------
await db.exec(`
  insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind, partial) values
    ('madina', '2026-10-08T09:00Z', '2026-10-08T17:00Z', 'planned', false),
    ('madina', '2026-10-16T09:00Z', '2026-10-16T17:00Z', 'planned', true),
    ('osu', now() - interval '1 hour', now() + interval '1 hour', 'fault', false)
  on conflict (zone_id, starts_at, ends_at, kind) do nothing;`); // the two Madina windows are real, already seeded
await report(1, "madina", "powered", "2026-10-08T09:30Z");
await report(1, "madina", "outage", "2026-10-08T10:00Z"); // latest answer of user 1 wins
await report(2, "madina", "outage", "2026-10-08T11:00Z");
await report(3, "madina", "powered", "2026-10-08T12:00Z");
await report(4, "madina", "outage", "2026-10-08T18:00Z"); // after the window
await report(1, "madina", "outage", "2026-10-16T10:00Z");
await report(2, "madina", "powered", "2026-10-16T10:00Z");
await report(3, "madina", "powered", "2026-10-16T10:00Z");
await report(4, "madina", "unstable", "2026-10-16T10:00Z"); // not an answer
const outcomes = (
  await db.query(
    `select zone_id, partial, residents_cut::int, residents_powered::int, finished from public.announcement_outcomes
     where (zone_id = 'madina' and starts_at in ('2026-10-08T09:00Z', '2026-10-16T09:00Z')) or (zone_id = 'osu' and kind = 'fault')
     order by starts_at`,
  )
).rows;
assert.deepEqual(outcomes, [
  { zone_id: "madina", partial: false, residents_cut: 2, residents_powered: 1, finished: true },
  { zone_id: "madina", partial: true, residents_cut: 1, residents_powered: 2, finished: true },
  { zone_id: "osu", partial: false, residents_cut: 0, residents_powered: 0, finished: false },
]);

// --- Tasks 59/70 and 68: neighbourhood state, planned or surprise -------------------------
for (const n of [1, 2, 3]) await report(n, "osu", "outage", now); // Osu: 3 outages, schedule running
await report(4, "osu", "powered", now);
await report(5, "labone", "outage", now); // Labone: 1 outage, nothing planned
await report(6, "dansoman", "outage", now); // Dansoman: outage then restored, tie
await report(7, "dansoman", "restored", now);
for (const n of [8, 9, 10]) await report(n, "achimota", "outage", minutesAgo(180)); // too old
const state = Object.fromEntries(
  (
    await db.query(
      "select zone_id, status, planned_now, outage_origin from public.zone_status where zone_id in ('osu','labone','dansoman','achimota')",
    )
  ).rows.map((row) => [row.zone_id, row]),
);
assert.deepEqual(state.osu, { zone_id: "osu", status: "confirmed_outage", planned_now: true, outage_origin: "planned" });
assert.deepEqual(state.labone, { zone_id: "labone", status: "probable_outage", planned_now: false, outage_origin: "surprise" });
assert.deepEqual(state.dansoman, { zone_id: "dansoman", status: "powered", planned_now: false, outage_origin: null });
assert.deepEqual(state.achimota, { zone_id: "achimota", status: "powered", planned_now: false, outage_origin: null });

// --- Task 53: rate limit, 5 reports per user per 10 minutes -------------------------------
for (let i = 0; i < 5; i++) await report(11, "osu", "outage", now);
await rejects(report(11, "osu", "outage", now), "sixth report in 10 minutes");

// --- Task 73: a user cannot write other people's data -------------------------------------
await as(12, (tx) => tx.query("insert into public.outage_reports (zone_id, kind) values ('osu', 'outage')"));
await rejects(
  as(12, (tx) => tx.query("insert into public.outage_reports (user_id, zone_id, kind) values ($1, 'osu', 'outage')", [user(1)])),
  "report in another user's name",
);
await rejects(
  as(null, (tx) => tx.query("insert into public.outage_reports (zone_id, kind) values ('osu', 'outage')")),
  "anonymous visitor report",
);
await rejects(
  as(12, (tx) => tx.query("insert into public.ecg_schedules (zone_id, starts_at, ends_at) values ('osu', now(), now() + interval '1 hour')")),
  "user writing ECG schedules",
);
await rejects(
  as(12, (tx) => tx.query("insert into public.zone_groups values ('osu', 'A', false, 'x', '2026-01-01', '2026-01-02')")),
  "user writing load-shedding groups",
);
const otherReports = await as(12, (tx) => tx.query(`update public.outage_reports set kind = 'powered' where user_id = '${user(1)}'`));
assert.equal(otherReports.affectedRows, 0, "user changed another user's reports");
const otherProfile = await as(12, (tx) => tx.query(`update public.profiles set display_name = 'x' where id = '${user(1)}'`));
assert.equal(otherProfile.affectedRows, 0, "user changed another user's profile");
const readProfiles = await as(12, (tx) => tx.query("select id from public.profiles"));
assert.deepEqual(readProfiles.rows, [{ id: user(12) }], "user read other profiles");
const ownProfile = await as(12, (tx) => tx.query("update public.profiles set display_name = 'Ama', zone_id = 'madina'"));
assert.equal(ownProfile.affectedRows, 1, "user could not edit their own profile");
const publicMap = await as(null, (tx) => tx.query("select count(*)::int as n from public.zone_status"));
assert.equal(publicMap.rows[0].n, 10, "the map must stay public");

// --- Dated load-shedding groups generated from data/ --------------------------------------
const sources = (
  await db.query("select source, count(*)::int as n from public.zone_groups group by source order by source")
).rows;
assert.deepEqual(sources.map((row) => row.source), ["3news_2026", "ecg_pdf_2023"]);
const tema = (
  await db.query("select group_id, source from public.zone_groups where zone_id = 'tema-community-1'")
).rows;
assert.deepEqual(tema, [{ group_id: "D", source: "ecg_pdf_2023" }]);
await rejects(db.exec("insert into public.zone_groups values ('osu', 'Z', false, 'x', '2026-01-01', '2026-01-02')"), "unknown group");

// --- Tasks 65-66: importing the same schedule twice adds nothing --------------------------
const importOnce = `insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind, partial, localities)
  values ('madina', '2026-10-14T09:00Z', '2026-10-14T17:00Z', 'planned', true, 'UN Madina')
  on conflict (zone_id, starts_at, ends_at, kind) do nothing`;
await db.exec(importOnce);
await db.exec(importOnce);
const imported = await db.query("select count(*)::int as n from public.ecg_schedules where zone_id = 'madina' and starts_at = '2026-10-14T09:00Z'");
const seeded = await db.query("select count(*)::int as n from public.ecg_schedules where source_url <> ''");
assert.ok(seeded.rows[0].n >= 50, "the real ECG schedules of data/ must be seeded");
assert.equal(imported.rows[0].n, 1);

// --- Offline reports (PAN's review of #6) ------------------------------------------------
// 1. A report observed 3 h ago and sent now is not a current outage, and it answers the
//    announcement that was running when it was observed.
await db.exec(`insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind)
  values ('cantonments', now() - interval '4 hours', now() - interval '2 hours 30 minutes', 'planned')`);
await as(13, (tx) =>
  tx.query("insert into public.outage_reports (zone_id, kind, observed_at) values ('cantonments', 'outage', now() - interval '3 hours')"),
);
const cantonments = (await db.query("select status from public.zone_status where zone_id = 'cantonments'")).rows[0];
assert.equal(cantonments.status, "powered", "an old observation must not colour the map now");
const answered = (
  await db.query(
    "select residents_cut::int from public.announcement_outcomes where zone_id = 'cantonments' and kind = 'planned' and starts_at > now() - interval '5 hours'",
  )
).rows[0];
assert.equal(answered.residents_cut, 1, "the late report answers the announcement it was observed in");
await rejects(
  as(13, (tx) => tx.query("insert into public.outage_reports (zone_id, kind, observed_at) values ('osu', 'outage', now() + interval '1 hour')")),
  "observation in the future",
);
await rejects(
  as(13, (tx) => tx.query("insert into public.outage_reports (zone_id, kind, observed_at) values ('osu', 'outage', now() - interval '25 hours')")),
  "observation older than 24 hours",
);
// 2. The phone retries the same report after lost answers: stored once.
const clientId = "11111111-2222-4333-8444-555555555555";
for (let attempt = 0; attempt < 3; attempt++) {
  await as(14, (tx) =>
    tx.query(
      "insert into public.outage_reports (zone_id, kind, client_id) values ('airport-residential', 'outage', $1) on conflict (client_id) do nothing",
      [clientId],
    ),
  );
}
const stored = await db.query("select count(*)::int as n from public.outage_reports where client_id = $1", [clientId]);
assert.equal(stored.rows[0].n, 1, "a retried report must be stored once");
const airport = (await db.query("select status from public.zone_status where zone_id = 'airport-residential'")).rows[0];
assert.equal(airport.status, "probable_outage", "one resident must not confirm an outage alone");

// 3. Retrying the 5th report of a user is not refused by the rate limit.
const fifthId = "22222222-3333-4444-8555-666666666666";
for (let i = 0; i < 4; i++) await report(15, "achimota", "powered", now);
const fifth = () =>
  as(15, (tx) =>
    tx.query(
      "insert into public.outage_reports (zone_id, kind, client_id) values ('achimota', 'powered', $1) on conflict (client_id) do nothing",
      [fifthId],
    ),
  );
await fifth();
await fifth(); // retry after a lost answer: must not raise "Too many reports"
const fifthRows = await db.query("select count(*)::int as n from public.outage_reports where user_id = $1", [user(15)]);
assert.equal(fifthRows.rows[0].n, 5);
await rejects(
  as(15, (tx) => tx.query("insert into public.outage_reports (zone_id, kind) values ('achimota', 'powered')")),
  "a genuinely new 6th report",
);

// --- Task 69: simulated demo reports -------------------------------------------------------
// demo:on / demo:off reach the Supabase CLI through Node, without npx (works on Windows).
const [cli, cliArgs] = cliCommand(["--version"]);
assert.equal(cli, process.execPath);
assert.ok(existsSync(cliArgs[0]), "the Supabase CLI entry exists");
assert.match(execFileSync(cli, cliArgs, { encoding: "utf8" }), /\d+\.\d+\.\d+/);
assert.match(
  execFileSync(process.execPath, [fileURLToPath(new URL("./demo-data.mjs", import.meta.url)), "print"], { encoding: "utf8" }),
  /\[SIMULÉ\]/,
);
await rejects(
  as(16, (tx) => tx.query("insert into public.outage_reports (zone_id, kind, simulated) values ('osu', 'outage', true)")),
  "an app user writing a simulated report",
);
await rejects(db.exec("insert into public.outage_reports (zone_id, kind) values ('osu', 'outage')"), "a resident report without user");
await db.exec("delete from public.outage_reports"); // the scenario alone, without earlier fixtures
await db.exec(insertSql());
const demoState = Object.fromEntries(
  (
    await db.query(
      "select zone_id, status, simulated_reports::int from public.zone_status where zone_id in ('osu','labone','dansoman','madina')",
    )
  ).rows.map((row) => [row.zone_id, row]),
);
assert.equal(demoState.osu.status, "confirmed_outage");
assert.equal(demoState.osu.simulated_reports, 4);
assert.equal(demoState.labone.status, "probable_outage");
assert.equal(demoState.dansoman.status, "probable_outage");
assert.equal(demoState.madina.status, "powered");
const labelled = await db.query("select count(*)::int as n from public.outage_reports where simulated and description like '[SIMULÉ]%'");
assert.equal(labelled.rows[0].n, scenario.length, "every simulated report is labelled");
// A simulated outage during an announcement never measures it.
await db.exec(`insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind)
  values ('labone', now() - interval '1 hour', now() + interval '1 hour', 'planned')`);
const labone = (
  await db.query("select residents_cut::int from public.announcement_outcomes where zone_id = 'labone' and starts_at > now() - interval '2 hours'")
).rows[0];
assert.equal(labone.residents_cut, 0, "simulated reports must not count as residents' answers");
await db.exec(deleteSql);
const left = await db.query("select count(*)::int as n from public.outage_reports where simulated");
assert.equal(left.rows[0].n, 0);

// --- Forecasts: the SQL written by prediction/predict.py loads, is public and read-only ---
await db.exec(readFileSync(join(root, "..", "predictions_seed.sql"), "utf8"));
await db.exec(readFileSync(join(root, "..", "predictions_seed.sql"), "utf8")); // re-run: no duplicate
const forecasts = await as(null, (tx) =>
  tx.query("select zone_id, probability, basis from public.predictions order by zone_id"),
);
assert.equal(forecasts.rows.length, 10, "one forecast per pilot zone, readable without account");
assert.ok(forecasts.rows.every((row) => row.basis !== ""), "every forecast says what it rests on");
await rejects(
  as(12, (tx) =>
    tx.query("insert into public.predictions (zone_id, window_start, window_end, probability, confidence, expected_duration_min, method, model_version) values ('osu', now(), now() + interval '1 hour', 99, 99, 60, 'rules', 'x')"),
  ),
  "user writing forecasts",
);

await db.close();
console.log(`OK: ${migrations.length} migrations + seed; positions, rate limit, row level security, zone state, planned or surprise, outcomes, groups, idempotent import, forecasts, offline reports, simulated demo`);
