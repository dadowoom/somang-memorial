import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
export const SOURCE_KEY = "deceased-1980-1999-260806";
const text = x => (x == null ? "" : String(x).trim());
const norm = x => text(x).replace(/\s+/g, "");
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function prepareRecords(input) {
  if (
    input.sourceKey !== SOURCE_KEY ||
    !/^[a-f0-9]{64}$/.test(input.sourceSha256) ||
    !Array.isArray(input.records)
  )
    throw Error("Invalid source");
  const seen = new Set();
  return input.records.map(r => {
    if (
      !Number.isInteger(r.sourceRow) ||
      r.sourceRow < 2 ||
      r.sourceRow > 503 ||
      seen.has(r.sourceRow)
    )
      throw Error("Invalid or duplicate source row");
    seen.add(r.sourceRow);
    const name = text(r.name),
      deathDate = text(r.deathDate),
      rawBirth = text(r.birthDate),
      burialPlace = text(r.burialPlace),
      role = text(r.role) || null;
    if (
      !name ||
      name.length > 120 ||
      !validDate(deathDate) ||
      deathDate < "1980-01-01" ||
      deathDate > "1999-12-31" ||
      burialPlace.length > 255 ||
      (role?.length ?? 0) > 80
    )
      throw Error("Invalid source fields");
    const birthDate =
      validDate(rawBirth) && rawBirth <= deathDate ? rawBirth : "";
    // Negative source IDs isolate this attachment from the existing positive source IDs.
    const result = {
      sourceId: -198000000 - r.sourceRow,
      name,
      nameNormalized: norm(name),
      role,
      birthDate,
      deathDate,
      deathAge: text(r.deathAge) || null,
      burialPlace,
      burialDate: null,
    };
    if ((result.deathAge?.length ?? 0) > 20) throw Error("Invalid age");
    result.sourcePayload = JSON.stringify({
      sourceKey: SOURCE_KEY,
      sourceSha256: input.sourceSha256,
      sourceRow: r.sourceRow,
      ...result,
    });
    return result;
  });
}
export function planImport(records, existing) {
  const insert = [],
    skipped = [];
  for (const r of records) {
    const source = existing.find(x => x.sourceId === r.sourceId);
    if (source) {
      if (source.sourcePayload !== r.sourcePayload)
        throw Error("Source ID collision or changed source; review required");
      skipped.push(r.sourceId);
      continue;
    }
    const identity = existing.filter(
      x => norm(x.nameNormalized) === r.nameNormalized
    );
    if (
      identity.some(
        x =>
          (r.birthDate && x.birthDate === r.birthDate) ||
          x.deathDate === r.deathDate
      )
    )
      throw Error("Possible existing person; review required");
    if (
      insert.some(
        x =>
          x.nameNormalized === r.nameNormalized && x.deathDate === r.deathDate
      )
    )
      throw Error("Duplicate person in source");
    insert.push(r);
  }
  return { insert, skipped };
}
async function main() {
  const args = process.argv.slice(2),
    apply = args.includes("--apply");
  if (args.length !== (apply ? 2 : 1))
    throw Error("Usage: importEarlyDeceased.mjs source.json [--apply]");
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ quiet: true });
  const { default: mysql } = await import("mysql2/promise");
  const records = prepareRecords(
    JSON.parse(await fs.readFile(args[0], "utf8"))
  );
  if (records.length !== 502) throw Error("Expected 502 source records");
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [[lock]] = await c.query(
      "SELECT GET_LOCK('somang-early-deceased-import',10) AS acquired"
    );
    if (lock.acquired !== 1) throw Error("Import already running");
    await c.query(apply ? "START TRANSACTION" : "START TRANSACTION READ ONLY");
    const [existing] = await c.query(
      "SELECT sourceId,nameNormalized,birthDate,deathDate,sourcePayload FROM somang_interment_records" +
        (apply ? " FOR UPDATE" : "")
    );
    const plan = planImport(records, existing);
    if (apply) {
      for (const r of plan.insert) {
        await c.execute(
          "INSERT INTO somang_interment_records (sourceId,name,nameNormalized,role,birthDate,deathDate,deathAge,burialPlace,burialDate,sourcePayload) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            r.sourceId,
            r.name,
            r.nameNormalized,
            r.role,
            r.birthDate,
            r.deathDate,
            r.deathAge,
            r.burialPlace,
            r.burialDate,
            r.sourcePayload,
          ]
        );
      }
      await c.commit();
    } else await c.rollback();
    console.log(
      JSON.stringify({
        applied: apply,
        existing: existing.length,
        insert: plan.insert.length,
        skipped: plan.skipped.length,
        unknownBirth: records.filter(r => !r.birthDate).length,
        unknownBurial: records.filter(r => !r.burialPlace).length,
      })
    );
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    await c.end();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    console.error(
      "Import stopped. No partial transaction committed. Review source and database before retrying."
    );
    process.exitCode = 1;
  });
}
