import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

/**
 * 소망동산 안장 명단 1995~2006 추가 등록 (2026-09-20).
 *
 * 교회에서 받은 엑셀(「1995 - 2006 안장 명단.xlsx」)을 JSON 으로 옮겨 넣는다.
 * 기존 명단(1980~1999, 502명 등)과 겹치는 분은 넣지 않는다. 이름이 같은 분이
 * 이미 있으면 **한 명도 넣지 않고 멈춘다** — 같은 분인지 동명이인인지는 사람이
 * 교회에 확인해야 하기 때문이다.
 *
 * 엑셀의 "비고" 칸에는 살아 계신 유가족 성함이 적혀 있다. 그 칸은 옮기지 않는다.
 *
 * 쓰는 법 (서버에서):
 *   node scripts/importInterment1995_2006.mjs source.json           # 확인만
 *   node scripts/importInterment1995_2006.mjs source.json --apply   # 실제 등록
 */
export const SOURCE_KEY = "interment-1995-2006-260920";
/** 기존 자료의 번호와 겹치지 않도록 이 명단만의 음수 번호대를 쓴다. */
export const SOURCE_ID_BASE = -200600000;
export const BURIAL_PLACE = "소망동산";

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
  ) {
    throw Error("Invalid source");
  }
  const seen = new Set();
  return input.records.map(r => {
    if (
      !Number.isInteger(r.sourceRow) ||
      r.sourceRow < 2 ||
      r.sourceRow > 1000 ||
      seen.has(r.sourceRow)
    ) {
      throw Error("Invalid or duplicate source row");
    }
    seen.add(r.sourceRow);
    const name = text(r.name);
    const deathDate = text(r.deathDate);
    const rawBirth = text(r.birthDate);
    if (
      !name ||
      name.length > 120 ||
      !validDate(deathDate) ||
      deathDate < "1995-01-01" ||
      deathDate > "2006-12-31"
    ) {
      throw Error("Invalid source fields");
    }
    // 생년월일은 형식이 맞고 소천일보다 앞설 때만 쓴다. 나머지는 비워 둔다.
    const birthDate =
      validDate(rawBirth) && rawBirth <= deathDate ? rawBirth : "";
    const result = {
      sourceId: SOURCE_ID_BASE - r.sourceRow,
      name,
      nameNormalized: norm(name),
      role: null,
      birthDate,
      deathDate,
      deathAge: null,
      burialPlace: BURIAL_PLACE,
      burialDate: null,
    };
    // 유가족 성함(비고)은 담지 않는다. 어디서 온 줄인지만 남긴다.
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
  const insert = [];
  const skipped = [];
  for (const r of records) {
    const same = existing.find(x => x.sourceId === r.sourceId);
    if (same) {
      if (same.sourcePayload !== r.sourcePayload) {
        throw Error("Source ID collision or changed source; review required");
      }
      skipped.push(r.sourceId);
      continue;
    }
    // 이름이 같은 분이 이미 있으면 멈춘다. 같은 분의 다른 기록일 수도 있고,
    // 동명이인일 수도 있어서 기계가 정할 일이 아니다.
    if (existing.some(x => norm(x.nameNormalized) === r.nameNormalized)) {
      throw Error(`Existing person with the same name; review required`);
    }
    if (insert.some(x => x.nameNormalized === r.nameNormalized)) {
      throw Error("Duplicate person in source");
    }
    insert.push(r);
  }
  return { insert, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  if (args.length !== (apply ? 2 : 1)) {
    throw Error("Usage: importInterment1995_2006.mjs source.json [--apply]");
  }
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ quiet: true });
  const { default: mysql } = await import("mysql2/promise");
  const records = prepareRecords(
    JSON.parse(await fs.readFile(args[0], "utf8"))
  );
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [[lock]] = await c.query(
      "SELECT GET_LOCK('somang-interment-1995-2006-import',10) AS acquired"
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
    } else {
      await c.rollback();
    }
    console.log(
      JSON.stringify({
        applied: apply,
        existing: existing.length,
        source: records.length,
        insert: plan.insert.length,
        skipped: plan.skipped.length,
        unknownBirth: records.filter(r => !r.birthDate).length,
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
  main().catch(error => {
    console.error(
      "Import stopped. No partial transaction committed. Review source and database before retrying.",
      error?.message ?? error
    );
    process.exitCode = 1;
  });
}
