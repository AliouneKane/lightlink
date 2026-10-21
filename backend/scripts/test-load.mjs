// Task 131: 100 reports at once on the hosted project, with the checks of every report
// (position, observation time; simulated reports skip the rate limit and the alerts),
// then the live map read 10 times.
// Reports are simulated (labelled, excluded from ECG measures) and deleted at the end.
// Usage (backend/, project linked): npm run test:load
// Limit: one burst inside the database; it does not simulate 100 phones on the network.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cliCommand } from "./demo-data.mjs";

const sql = `
create temp table load_result (inserted_ms numeric, map_ms numeric);
do $$
declare
  started timestamptz := clock_timestamp();
  inserted interval;
  mapped interval;
  zones text[] := array(select id from public.zones order by id);
begin
  insert into public.outage_reports (zone_id, kind, description, simulated, observed_at)
  select zones[1 + (n % array_length(zones, 1))],
         case when n % 3 = 0 then 'powered' else 'outage' end,
         '[SIMULÉ] test de charge', true, now() - (n || ' seconds')::interval
  from generate_series(1, 100) as n;
  inserted := clock_timestamp() - started;
  started := clock_timestamp();
  for i in 1..10 loop
    perform * from public.zone_status;
  end loop;
  mapped := (clock_timestamp() - started) / 10;
  delete from public.outage_reports where description = '[SIMULÉ] test de charge';
  insert into load_result values (
    round(extract(epoch from inserted) * 1000), round(extract(epoch from mapped) * 1000));
end;
$$;
select inserted_ms, map_ms, (select count(*) from public.outage_reports
  where description = '[SIMULÉ] test de charge') as left_over from load_result;
`;

const dir = mkdtempSync(join(tmpdir(), "lightlink-load-"));
try {
  const file = join(dir, "load.sql");
  writeFileSync(file, sql);
  const [command, args] = cliCommand(["db", "query", "--linked", "-f", file]);
  const output = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const row = JSON.parse(output.slice(output.indexOf("{"))).rows[0];
  const inserted = Number(row.inserted_ms);
  const map = Number(row.map_ms);
  if (Number(row.left_over) !== 0) throw new Error("test reports were not deleted");
  if (inserted > 2000 || map > 500) throw new Error(`too slow: ${inserted} ms, ${map} ms`);
  console.log(`OK: 100 reports inserted in ${inserted} ms, map read in ${map} ms, test data deleted.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
