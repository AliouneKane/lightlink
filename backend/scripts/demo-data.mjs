// Task 69: realistic demo reports for the live map, always labelled as simulated.
// Usage (in backend/, project linked with `npx supabase link`):
//   npm run demo:on    adds the scenario below, observed in the last hour
//   npm run demo:off   removes every simulated report
// Simulated reports leave the map by themselves after 2 hours, never count in the
// measure of ECG announcements, and cannot be written by app users.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// One line per report: zone, kind, minutes ago, what a resident would write.
// Osu confirmed (3+ outages, a surprise), Labone and Dansoman probable, Madina powered.
export const scenario = [
  ["osu", "outage", 12, "No power since noon on Oxford Street."],
  ["osu", "outage", 20, "Outage near Danquah Circle too."],
  ["osu", "outage", 31, "The whole neighbourhood is in the dark."],
  ["osu", "outage", 44, "Outage at home, the fridge stopped."],
  ["labone", "outage", 18, "Outage in Labone, nothing for 20 minutes."],
  ["dansoman", "outage", 25, "Power cut near the market."],
  ["dansoman", "outage", 38, "Same on my side."],
  ["dansoman", "restored", 9, "Power is back on my street."],
  ["madina", "powered", 15, "All good in Madina."],
  ["madina", "powered", 27, "Stable power here."],
];

const quote = (text) => `'${text.replaceAll("'", "''")}'`;

export function insertSql(rows = scenario) {
  const values = rows.map(
    ([zone, kind, minutes, text]) =>
      `  (${quote(zone)}, ${quote(kind)}, ${quote(`[SIMULATED] ${text}`)}, true, now() - interval '${minutes} minutes')`,
  );
  return [
    "insert into public.outage_reports (zone_id, kind, description, simulated, observed_at) values",
    values.join(",\n") + ";",
  ].join("\n");
}

export const deleteSql = "delete from public.outage_reports where simulated;";

/**
 * The Supabase CLI run with Node itself, not through `npx`: spawning `npx` fails on Windows
 * (ENOENT, PAN's review of #8). Works the same on macOS, Linux and Windows.
 */
export function cliCommand(args) {
  const require = createRequire(import.meta.url);
  const manifest = require.resolve("supabase/package.json");
  const { bin } = require(manifest);
  const entry = typeof bin === "string" ? bin : bin.supabase;
  return [process.execPath, [join(dirname(manifest), entry), ...args]];
}

function run(sql) {
  const dir = mkdtempSync(join(tmpdir(), "lightlink-demo-"));
  const file = join(dir, "demo.sql");
  try {
    writeFileSync(file, sql);
    const [command, args] = cliCommand(["db", "query", "--linked", "-f", file]);
    execFileSync(command, args, { stdio: ["ignore", "ignore", "inherit"] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode === "on") {
    run(`${deleteSql}\n${insertSql()}`);
    console.log(`${scenario.length} simulated reports added (labelled [SIMULATED], gone from the map within 2 hours).`);
  } else if (mode === "off") {
    run(deleteSql);
    console.log("Simulated reports removed.");
  } else if (mode === "print") {
    console.log(`${deleteSql}\n${insertSql()}`);
  } else {
    console.error("Usage: node scripts/demo-data.mjs on | off | print");
    process.exit(1);
  }
}
