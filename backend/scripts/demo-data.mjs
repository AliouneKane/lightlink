// Task 69: realistic demo reports for the live map, always labelled as simulated.
// Usage (in backend/, project linked with `npx supabase link`):
//   npm run demo:on    adds the scenario below, observed in the last hour
//   npm run demo:off   removes every simulated report
// Simulated reports leave the map by themselves after 2 hours, never count in the
// measure of ECG announcements, and cannot be written by app users.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// One line per report: zone, kind, minutes ago, what a resident would write.
// Osu confirmed (3+ outages, a surprise), Labone and Dansoman probable, Madina powered.
export const scenario = [
  ["osu", "outage", 12, "Plus de courant depuis midi sur Oxford Street."],
  ["osu", "outage", 20, "Coupure aussi vers le Danquah Circle."],
  ["osu", "outage", 31, "Tout le quartier est dans le noir."],
  ["osu", "outage", 44, "Coupure chez moi, le frigo s'est arrêté."],
  ["labone", "outage", 18, "Coupure à Labone, rien depuis 20 minutes."],
  ["dansoman", "outage", 25, "Courant coupé près du marché."],
  ["dansoman", "outage", 38, "Pareil de mon côté."],
  ["dansoman", "restored", 9, "Le courant est revenu dans ma rue."],
  ["madina", "powered", 15, "Tout va bien à Madina."],
  ["madina", "powered", 27, "Courant stable ici."],
];

const quote = (text) => `'${text.replaceAll("'", "''")}'`;

export function insertSql(rows = scenario) {
  const values = rows.map(
    ([zone, kind, minutes, text]) =>
      `  (${quote(zone)}, ${quote(kind)}, ${quote(`[SIMULÉ] ${text}`)}, true, now() - interval '${minutes} minutes')`,
  );
  return [
    "insert into public.outage_reports (zone_id, kind, description, simulated, observed_at) values",
    values.join(",\n") + ";",
  ].join("\n");
}

export const deleteSql = "delete from public.outage_reports where simulated;";

function run(sql) {
  const dir = mkdtempSync(join(tmpdir(), "lightlink-demo-"));
  const file = join(dir, "demo.sql");
  try {
    writeFileSync(file, sql);
    execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", file], {
      stdio: ["ignore", "ignore", "inherit"],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode === "on") {
    run(`${deleteSql}\n${insertSql()}`);
    console.log(`${scenario.length} simulated reports added (labelled [SIMULÉ], gone from the map within 2 hours).`);
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
