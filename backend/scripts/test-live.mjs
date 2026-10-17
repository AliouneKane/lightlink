// Task 72: end-to-end test on the hosted Supabase project, the way the apps use it.
// A resident signs in anonymously, reports, and the live map (zone_status + Realtime) sees it.
// It only sends a "powered" report: it never colours a neighbourhood as cut on the real map.
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run test:live   (public values only)
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (Project Settings > API).");
  process.exit(1);
}
const zone = "tema-community-1";
const db = createClient(url, anonKey, { auth: { persistSession: false } });
const step = (label) => console.log(`- ${label}`);

// 1. The map is public: 10 pilot zones, real ECG schedules seeded.
const { data: zones, error: zonesError } = await db.from("zone_status").select("zone_id");
assert.ifError(zonesError);
assert.equal(zones.length, 10);
const { count: schedules } = await db
  .from("ecg_schedules")
  .select("id", { count: "exact", head: true });
assert.ok(schedules >= 50, `expected the ECG schedules, found ${schedules}`);
step(`map public: 10 zones, ${schedules} ECG schedules`);

// 2. Without a session, reporting is refused.
const anonymousInsert = await db
  .from("outage_reports")
  .insert({ zone_id: zone, kind: "powered" });
assert.ok(anonymousInsert.error, "a visitor without session must not report");
step("report without session refused");

// 3. Two taps: anonymous session, then report.
const { data: auth, error: authError } = await db.auth.signInAnonymously();
assert.ifError(authError);
const before = await db.from("zone_status").select("powered_reports").eq("zone_id", zone).single();
assert.ifError(before.error);

const received = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("no Realtime event within 15 s")), 15_000);
  const channel = db
    .channel("e2e")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "outage_reports" }, (event) => {
      if (event.new.user_id === auth.user.id) {
        clearTimeout(timeout);
        void db.removeChannel(channel);
        resolve(event.new);
      }
    })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void db
        .from("outage_reports")
        .insert({ zone_id: zone, kind: "powered", description: "[test bout en bout]" })
        .then(({ error }) => error && reject(error));
    });
});
const event = await received;
assert.equal(event.zone_id, zone);
step("anonymous report stored and pushed live (Realtime)");

// 4. The live map counts it.
const after = await db.from("zone_status").select("powered_reports").eq("zone_id", zone).single();
assert.ifError(after.error);
assert.equal(Number(after.data.powered_reports), Number(before.data.powered_reports) + 1);
step("zone_status counts the new report");

// 5. Nobody reports in another resident's name.
const forged = await db.from("outage_reports").insert({
  zone_id: zone,
  kind: "powered",
  user_id: "00000000-0000-0000-0000-000000000001",
});
assert.ok(forged.error, "a report in another user's name must be refused");
step("report in another user's name refused");

await db.auth.signOut();
console.log("OK: end-to-end on the hosted project");
process.exit(0);
