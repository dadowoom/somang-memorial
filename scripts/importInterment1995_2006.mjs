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
 *
 * --allow-existing-name 을 주면 "이름이 같은 분이 이미 있어도" 넣는다. 교회가
 * 동명이인이라고 확인해 준 분들만 이 선택지로 넣는다(2026-09-21). 이때에도
 * 생년월일이나 소천일이 하나라도 같으면 여전히 멈춘다 — 같은 분일 수 있어서다.
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

export function planImport(records, existing, { allowExistingName = false } = {}) {
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
    const sameName = existing.filter(
      x => norm(x.nameNormalized) === r.nameNormalized
    );
    if (sameName.length > 0) {
      if (!allowExistingName) {
        throw Error("Existing person with the same name; review required");
      }
      // 동명이인이라고 확인받았더라도, 날짜가 하나라도 겹치면 같은 분일 수 있다.
      if (
        sameName.some(
          x =>
            x.deathDate === r.deathDate ||
            (r.birthDate && x.birthDate === r.birthDate)
        )
      ) {
        throw Error("Same name and date as an existing record; review required");
      }
    }
    if (
      insert.some(
        x =>
          x.nameNormalized === r.nameNormalized &&
          (x.deathDate === r.deathDate ||
            (r.birthDate && x.birthDate === r.birthDate))
      ) ||
      (!allowExistingName &&
        insert.some(x => x.nameNormalized === r.nameNormalized))
    ) {
      throw Error("Duplicate person in source");
    }
    insert.push(r);
  }
  return { insert, skipped };
}

/**
 * 교회가 명단을 고쳐서 다시 보낼 때 쓰는 "추가분만 넣기" (2026-09-22).
 *
 *   node scripts/importInterment1995_2006.mjs source.json --update           # 확인만
 *   node scripts/importInterment1995_2006.mjs source.json --update --apply   # 실제 등록
 *
 * 교회는 명단에 분들을 계속 덧붙여 보낸다. 새 파일은 줄이 밀리므로 줄 번호로
 * 번호를 매기면 기존 분과 겹친다. 그래서 추가분은 아래 번호대에서 차례로 받는다.
 *
 * 한 분씩 판단한다 (전체를 멈추지 않는다).
 * - 이미 있음: 이름이 같고 생년월일이나 소천일이 하나라도 같은 기록이 DB 에 있다.
 * - 보류: 날짜가 잘못됐거나, 이 파일 안에 같은 이름이 두 번 이상 있다. 교회 확인 필요.
 * - 넣음: 나머지. 이름만 같고 날짜가 전부 다르면 동명이인으로 보고 넣되, 목록에 표시한다.
 * 소천일은 명단에 적힌 대로 1995년 이전도 받는다(교회가 1991~1994 분을 덧붙임).
 */
export const UPDATE_SOURCE_ID_BASE = -200610000;
const UPDATE_SOURCE_ID_FLOOR = UPDATE_SOURCE_ID_BASE - 99999;
const UPDATE_SOURCE_KEY = /^interment-1995-2006-\d{6}$/;

export function prepareUpdateRecords(input, today) {
  if (
    !UPDATE_SOURCE_KEY.test(input.sourceKey ?? "") ||
    !/^[a-f0-9]{64}$/.test(input.sourceSha256) ||
    !Array.isArray(input.records) ||
    !validDate(today)
  ) {
    throw Error("Invalid source");
  }
  const seen = new Set();
  const records = [];
  const held = [];
  for (const r of input.records) {
    if (
      !Number.isInteger(r.sourceRow) ||
      r.sourceRow < 2 ||
      r.sourceRow > 5000 ||
      seen.has(r.sourceRow)
    ) {
      throw Error("Invalid or duplicate source row");
    }
    seen.add(r.sourceRow);
    const name = text(r.name);
    const deathDate = text(r.deathDate);
    const rawBirth = text(r.birthDate);
    if (!name || name.length > 120) {
      held.push({ sourceRow: r.sourceRow, name, reason: "이름 없음" });
      continue;
    }
    if (
      !validDate(deathDate) ||
      deathDate < "1900-01-01" ||
      deathDate > today
    ) {
      held.push({ sourceRow: r.sourceRow, name, reason: "소천일 확인 필요" });
      continue;
    }
    records.push({
      sourceRow: r.sourceRow,
      name,
      nameNormalized: norm(name),
      role: null,
      birthDate: validDate(rawBirth) && rawBirth <= deathDate ? rawBirth : "",
      deathDate,
      deathAge: null,
      burialPlace: BURIAL_PLACE,
      burialDate: null,
    });
  }
  return {
    records,
    held,
    sourceKey: input.sourceKey,
    sourceSha256: input.sourceSha256,
  };
}

export function planUpdate(prepared, existing) {
  const sameDate = (x, r) =>
    x.deathDate === r.deathDate ||
    (!!r.birthDate && x.birthDate === r.birthDate);
  const nameCount = new Map();
  for (const r of prepared.records) {
    nameCount.set(r.nameNormalized, (nameCount.get(r.nameNormalized) ?? 0) + 1);
  }
  let next = existing.reduce(
    (min, x) =>
      x.sourceId <= UPDATE_SOURCE_ID_BASE &&
      x.sourceId >= UPDATE_SOURCE_ID_FLOOR &&
      x.sourceId < min
        ? x.sourceId
        : min,
    UPDATE_SOURCE_ID_BASE
  );
  const insert = [];
  const already = [];
  const held = [...prepared.held];
  for (const r of prepared.records) {
    const sameName = existing.filter(
      x => norm(x.nameNormalized) === r.nameNormalized
    );
    if (sameName.some(x => sameDate(x, r))) {
      already.push(r.sourceRow);
      continue;
    }
    if (nameCount.get(r.nameNormalized) > 1) {
      held.push({
        sourceRow: r.sourceRow,
        name: r.name,
        reason: "파일 안에 같은 이름이 두 번 이상",
      });
      continue;
    }
    next -= 1;
    if (next < UPDATE_SOURCE_ID_FLOOR)
      throw Error("Update source ID range full");
    const { sourceRow, ...fields } = r;
    const record = { ...fields, sourceId: next };
    // 유가족 성함(비고)은 담지 않는다. 어디서 온 줄인지만 남긴다.
    record.sourcePayload = JSON.stringify({
      sourceKey: prepared.sourceKey,
      sourceSha256: prepared.sourceSha256,
      sourceRow,
      ...record,
    });
    insert.push({ ...record, sourceRow, homonym: sameName.length > 0 });
  }
  return { insert, already, held };
}

async function mainUpdate(args) {
  const apply = args.includes("--apply");
  const files = args.filter(a => !a.startsWith("--"));
  const unknown = args.filter(
    a => a.startsWith("--") && a !== "--apply" && a !== "--update"
  );
  if (files.length !== 1 || unknown.length > 0) {
    throw Error(
      "Usage: importInterment1995_2006.mjs source.json --update [--apply]"
    );
  }
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ quiet: true });
  const { default: mysql } = await import("mysql2/promise");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const prepared = prepareUpdateRecords(
    JSON.parse(await fs.readFile(files[0], "utf8")),
    today
  );
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [[lock]] = await c.query(
      "SELECT GET_LOCK('somang-interment-1995-2006-import',10) AS acquired"
    );
    if (lock.acquired !== 1) throw Error("Import already running");
    await c.query(apply ? "START TRANSACTION" : "START TRANSACTION READ ONLY");
    const [existing] = await c.query(
      "SELECT sourceId,nameNormalized,birthDate,deathDate FROM somang_interment_records" +
        (apply ? " FOR UPDATE" : "")
    );
    const plan = planUpdate(prepared, existing);
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
    // 이름과 날짜는 서버 화면에만 보인다. 저장소나 문서에는 옮기지 않는다.
    console.log(
      JSON.stringify(
        {
          applied: apply,
          existing: existing.length,
          source: prepared.records.length + prepared.held.length,
          already: plan.already.length,
          insert: plan.insert.map(r => ({
            row: r.sourceRow,
            name: r.name,
            birth: r.birthDate,
            death: r.deathDate,
            homonym: r.homonym,
          })),
          held: plan.held,
        },
        null,
        1
      )
    );
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    await c.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--update")) return mainUpdate(args);
  const apply = args.includes("--apply");
  const allowExistingName = args.includes("--allow-existing-name");
  const flags = (apply ? 1 : 0) + (allowExistingName ? 1 : 0);
  if (args.length !== flags + 1) {
    throw Error(
      "Usage: importInterment1995_2006.mjs source.json [--apply] [--allow-existing-name]"
    );
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
    const plan = planImport(records, existing, { allowExistingName });
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
        allowExistingName,
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
