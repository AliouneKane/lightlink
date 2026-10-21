// Applies every migration and the seed to an in-memory Postgres (PGlite), without Docker,
// then checks the behaviour the apps and the prediction model rely on.
// Usage: npm run test:sql   (about 20 MB of dependency instead of the Docker images of Supabase)
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { deleteSql, insertSql, scenario } from "./demo-data.mjs";

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
for (let n = 1; n <= 26; n++) {
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

// --- Phase 3: energy sharing (tasks 78-82, 89-91, 99, 102) -------------------------------
const offer = async (host, zone, extra = {}) =>
  (
    await as(host, (tx) =>
      tx.query(
        `insert into public.offers (zone_id, title, source, capacity, price, slots, ends_at)
         values ($1, $2, $3, '2 prises', $4, $5, now() + $6::interval) returning id`,
        [zone, extra.title ?? "Recharge solaire", extra.source ?? "solar", extra.price ?? 5, extra.slots ?? 1, extra.lasts ?? "2 hours"],
      ),
    )
  ).rows[0].id;
const request = (who, offerId) =>
  as(who, (tx) => tx.query("insert into public.offer_requests (offer_id) values ($1) returning id", [offerId])).then(
    (result) => result.rows[0].id,
  );
const move = (who, requestId, status) =>
  as(who, (tx) => tx.query("select public.set_request_status($1, $2) as s", [requestId, status]));
const address = (who, offerId) =>
  as(who, (tx) => tx.query("select address from public.offer_private_details where offer_id = $1", [offerId])).then(
    (result) => result.rows.map((row) => row.address),
  );

// 80: a resident creates an offer, with its exact place kept private (89).
const solar = await offer(17, "osu", { slots: 1 });
await as(17, (tx) => tx.query("insert into public.offer_private_details values ($1, 'Maison bleue, Oxford Street')", [solar]));
await rejects(offer(17, "osu", { lasts: "13 hours" }), "an offer longer than 12 hours");
await rejects(
  as(18, (tx) => tx.query("update public.offers set price = 999 where id = $1 returning id", [solar])).then((r) => {
    if (r.rows.length === 0) throw new Error("no row updated");
  }),
  "changing someone else's offer",
);
assert.deepEqual(await address(18, solar), [], "the exact place is hidden before acceptance");
assert.deepEqual(await address(null, solar), [], "and from visitors");

// 82: request, accept, finish; nobody but the host decides.
await rejects(request(17, solar), "requesting one's own offer");
const firstRequest = await request(18, solar);
await rejects(request(18, solar), "a second request on the same offer");
await rejects(move(18, firstRequest, "accepted"), "a requester accepting their own request");
await rejects(move(19, firstRequest, "refused"), "a stranger refusing a request");
await move(17, firstRequest, "accepted");
assert.deepEqual(await address(18, solar), ["Maison bleue, Oxford Street"], "the accepted requester sees the place");
const full = (await db.query("select status from public.offers where id = $1", [solar])).rows[0].status;
assert.equal(full, "full", "an offer with every place taken is full");
await rejects(request(19, solar), "requesting a full offer");
assert.deepEqual(await address(19, solar), [], "other residents still do not see the place");
const visible = await as(19, (tx) => tx.query("select id from public.offer_requests where offer_id = $1", [solar]));
assert.equal(visible.rows.length, 0, "requests are private to the requester and the host");
await move(18, firstRequest, "finished");
await rejects(move(17, firstRequest, "accepted"), "reopening a finished request");
const freed = (await db.query("select status from public.offers where id = $1", [solar])).rows[0].status;
assert.equal(freed, "available", "a finished request frees its place");
// An offer that stays full, for the search test below.
const busy = await offer(23, "osu", { title: "Générateur complet", source: "generator", slots: 1 });
await move(23, await request(24, busy), "accepted");

// At most 3 pending requests per resident.
const others = [];
for (let i = 0; i < 4; i++) others.push(await offer(20, "labone", { title: `Batterie ${i}`, source: "battery", slots: 2 }));
for (let i = 0; i < 3; i++) await request(21, others[i]);
await rejects(request(21, others[3]), "a 4th pending request");
// A cancelled request frees a place in the limit.
const cancelled = (await as(21, (tx) => tx.query("select id from public.offer_requests where offer_id = $1", [others[0]]))).rows[0].id;
await move(21, cancelled, "cancelled");
await request(21, others[3]);

// 81: nearest open offers first; full, closed and ended offers are not proposed.
await offer(22, "achimota", { title: "Générateur Achimota", source: "generator" });
await db.exec(`update public.offers set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 hours'
  where title = 'Batterie 3'`);
const nearOsu = (await as(null, (tx) => tx.query("select kind, title, zone_id, distance_km from public.energy_options('osu')"))).rows;
assert.ok(nearOsu.length >= 2);
assert.deepEqual(nearOsu.map((row) => row.distance_km), [...nearOsu.map((row) => row.distance_km)].sort((a, b) => a - b));
assert.ok(!nearOsu.some((row) => row.title === "Générateur complet"), "a full offer is not proposed");
assert.ok(nearOsu.some((row) => row.title === "Recharge solaire"), "a freed offer is proposed again");
assert.ok(!nearOsu.some((row) => row.title === "Batterie 3"), "an ended offer is not proposed");
assert.ok(nearOsu.every((row) => row.distance_km <= 10), "10 km around the neighbourhood");
assert.ok(!nearOsu.some((row) => row.kind === "place"), "fixed places only when the neighbourhood is cut");

// 91: the whole neighbourhood is cut: farther offers (25 km) and fixed energy places.
await db.exec(`insert into public.energy_places (name, kind, zone_id, lat, lng, source_url, verified_at)
  values ('Point de recharge test', 'charging_hub', 'airport-residential', 5.6052, -0.1718, 'https://example.org', '2026-10-21')`);
await db.exec("delete from public.outage_reports");
for (const n of [1, 2, 3]) await report(n, "tema-community-1", "outage", now);
const fromTema = (await as(null, (tx) => tx.query("select kind, distance_km from public.energy_options('tema-community-1')"))).rows;
assert.ok(fromTema.some((row) => row.kind === "place"), "fixed places are proposed when the neighbourhood is cut");
assert.ok(fromTema.some((row) => row.distance_km > 10), "the radius grows beyond 10 km");
const fromOsu = (await as(null, (tx) => tx.query("select kind from public.energy_options('osu')"))).rows;
assert.ok(!fromOsu.some((row) => row.kind === "place"));

// 90: residents report abuse; nobody else reads the reports.
await as(19, (tx) => tx.query("insert into public.abuse_reports (offer_id, reason) values ($1, 'Prix abusif')", [others[1]]));
await rejects(
  as(19, (tx) => tx.query("insert into public.abuse_reports (reason) values ('Rien')")),
  "an abuse report about nothing",
);
const readAbuse = await as(20, (tx) => tx.query("select id from public.abuse_reports"));
assert.equal(readAbuse.rows.length, 0, "abuse reports are not public");

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

// --- Phase 3: notifications (tasks 93-98, 118) -------------------------------------------
const inbox = (who, kind) =>
  as(who, (tx) => tx.query("select kind, title, body from public.notifications where kind = $1", [kind])).then((r) => r.rows);
// 97: the host was told about the request, the requester about the answer.
assert.equal((await inbox(17, "request_received")).length, 1);
const answerAlert = await inbox(18, "request_answered");
assert.equal(answerAlert.length, 1);
assert.equal(answerAlert[0].title, "Demande acceptée");
// 94: residents register their phone and follow neighbourhoods; invalid tokens are refused.
await as(25, (tx) => tx.query("insert into public.push_tokens (token, platform) values ('ExponentPushToken[abc]', 'android')"));
await rejects(as(25, (tx) => tx.query("insert into public.push_tokens (token, platform) values ('not-a-token', 'android')")), "an invalid push token");
await as(25, (tx) => tx.query("insert into public.zone_follows (zone_id) values ('adabraka')"));
await rejects(
  as(25, (tx) => tx.query("insert into public.zone_follows (user_id, zone_id) values ($1, 'osu')", [user(26)])),
  "following a zone for someone else",
);
// 95: one alert when the neighbourhood becomes a confirmed outage, not one per report.
await db.exec("delete from public.outage_reports");
for (const n of [1, 2, 3, 4]) await report(n, "adabraka", "outage", now);
const alerts = await inbox(25, "outage_in_zone");
assert.equal(alerts.length, 1, "one alert per confirmed outage");
assert.match(alerts[0].title, /Coupure à Adabraka/);
assert.equal((await inbox(26, "outage_in_zone")).length, 0, "only followers are alerted");
// 96 and 118: ECG reminders and high forecasts, once each, for followers only.
await db.exec(`insert into public.ecg_schedules (zone_id, starts_at, ends_at, kind)
  values ('adabraka', now() + interval '3 hours', now() + interval '8 hours', 'planned')`);
await db.exec(`insert into public.predictions (zone_id, window_start, window_end, probability, confidence,
    expected_duration_min, method, model_version, basis)
  values ('adabraka', date_trunc('day', now()) + interval '1 day 9 hours', date_trunc('day', now()) + interval '1 day 17 hours',
    60, 90, 480, 'rules', 'test', 'annonce ECG')`);
await db.query("select public.queue_daily_notifications()");
await db.query("select public.queue_daily_notifications()"); // the daily job may run twice
assert.equal((await inbox(25, "ecg_reminder")).length, 1, "one reminder per ECG outage");
const forecastAlert = await inbox(25, "prediction");
assert.equal(forecastAlert.length, 1, "one alert per high forecast");
assert.match(forecastAlert[0].body, /estimation/);
// The inbox is private; residents can only mark their own notifications read.
const notMine = await as(26, (tx) => tx.query("select id from public.notifications"));
assert.equal(notMine.rows.length, 0);
const marked = await as(26, (tx) => tx.query("update public.notifications set read_at = now()"));
assert.equal(marked.affectedRows, 0);

await db.close();
console.log(`OK: ${migrations.length} migrations + seed; positions, rate limit, row level security, zone state, planned or surprise, outcomes, groups, idempotent import, forecasts, offline reports, simulated demo, energy sharing, notifications`);
