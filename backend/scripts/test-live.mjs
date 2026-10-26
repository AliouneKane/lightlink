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
  const timeout = setTimeout(() => reject(new Error("no Realtime event within 20 s")), 20_000);
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
      // The server starts listening a moment after SUBSCRIBED; the apps subscribe long before
      // anyone reports, so the test waits like a real session would.
      setTimeout(() => {
        void db
          .from("outage_reports")
          .insert({ zone_id: zone, kind: "powered", description: "[test bout en bout]" })
          .then(({ error }) => error && reject(error));
      }, 3000);
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

// 6. Task 100: energy sharing from offer to the end, with two residents.
const host = db; // already signed in anonymously
const neighbour = createClient(url, anonKey, { auth: { persistSession: false } });
assert.ifError((await neighbour.auth.signInAnonymously()).error);
const endsAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
// The offer and its private address are created together (create_offer, review of #9).
const refused = await host.rpc("create_offer", {
  p_zone_id: "osu", p_host_name: "Test", p_title: "[test] Refusée", p_source: "battery", p_capacity: "1 prise",
  p_price: 0, p_slots: 1, p_description: "", p_ends_at: endsAt, p_address: "X",
});
assert.ok(refused.error, "an address too short is refused");
const leftover = await host.from("offers").select("id").eq("title", "[test] Refusée");
assert.equal(leftover.data.length, 0, "and no offer is left behind");
const created = await host.rpc("create_offer", {
  p_zone_id: "osu", p_host_name: "Test", p_title: "[test] Recharge", p_source: "battery", p_capacity: "1 prise",
  p_price: 0, p_slots: 1, p_description: "", p_ends_at: endsAt, p_address: "Adresse de test",
});
assert.ifError(created.error);
const offerId = created.data;
const found = await neighbour.rpc("energy_options", { origin_zone: "osu" });
assert.ifError(found.error);
assert.ok(found.data.some((row) => row.id === offerId && row.places_left === 1), "the offer is found nearby");
const hidden = await neighbour.from("offer_private_details").select("address").eq("offer_id", offerId);
assert.equal(hidden.data.length, 0, "the place is hidden before acceptance");
const asked = await neighbour.from("offer_requests").insert({ offer_id: offerId }).select("id").single();
assert.ifError(asked.error);
const accepted = await host.rpc("set_request_status", { request_id: asked.data.id, new_status: "accepted" });
assert.ifError(accepted.error);
const shown = await neighbour.from("offer_private_details").select("address").eq("offer_id", offerId);
assert.deepEqual(shown.data, [{ address: "Adresse de test" }], "the accepted neighbour sees the place");
const hostInbox = await host.from("notifications").select("kind").eq("kind", "request_received");
const neighbourInbox = await neighbour.from("notifications").select("title").eq("kind", "request_answered");
assert.ok(hostInbox.data.length >= 1 && neighbourInbox.data[0]?.title === "Demande acceptée", "both are notified");
assert.ifError((await neighbour.rpc("set_request_status", { request_id: asked.data.id, new_status: "finished" })).error);
assert.ifError((await host.from("offers").update({ status: "closed" }).eq("id", offerId)).error);
// The test offer stays closed on the project, titled "[test] Recharge": hosts cannot delete
// offers (by design). To remove them: delete from public.offers where title like '[test]%';
step("sharing: offer, search, request, notification, acceptance, private place, end");
await neighbour.auth.signOut();

await db.auth.signOut();
console.log("OK: end-to-end on the hosted project");
process.exit(0);
