import "dotenv/config";

import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const sourcePath = process.argv[2];
// 교회 소천자 명단 전체(소망동산이 아닌 곳에 모셔진 분 포함)를 넣을 때만 켠다
// (2026-09-21 사용자 결정: 이름·생년월일·소천일이 있으면 장지와 관계없이 등록).
// 장지 원문은 저장하지만, 공개 화면에는 "소망동산"/"다른 장지"로만 보인다
// (shared/kioskInterment.ts publicBurialPlace).
const anyBurialPlace = process.argv.includes("--any-burial-place");
// 기본은 "확인만" (2026-09-23). --apply 를 붙여야 실제로 쓴다. 전에는 돌리는 즉시
// 기존 기록의 이름·날짜·장지를 덮어썼다.
const apply = process.argv.includes("--apply");

if (!sourcePath || sourcePath.startsWith("--")) {
  throw new Error(
    "Usage: node importSomangIntermentRecords.mjs <records.json> [--any-burial-place] [--apply]"
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const raw = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const records = Array.isArray(raw) ? raw : raw.records;

if (!Array.isArray(records)) {
  throw new Error("The source file must contain a records array");
}

const toText = value => (value == null ? "" : String(value).trim());
const normalizeName = value => toText(value).replace(/\s+/g, "");

const normalized = records.map((record, index) => {
  const sourceId = Number(record.sourceId);
  const name = toText(record.name);
  const birthDate = toText(record.birthDate);
  const deathDate = toText(record.deathDate);
  const burialPlace = toText(record.burialPlace);

  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    throw new Error(`Invalid sourceId at record ${index + 1}`);
  }
  if (
    !name ||
    !birthDate ||
    !deathDate ||
    (!anyBurialPlace && !burialPlace.includes("소망동산"))
  ) {
    throw new Error(`Invalid Somang Garden record at row ${index + 1}`);
  }

  const payload = {
    sourceId,
    name,
    role: toText(record.role) || null,
    affiliation: toText(record.affiliation) || null,
    pastor: toText(record.pastor) || null,
    funeralChurch: toText(record.funeralChurch) || null,
    birthDate,
    deathDate,
    deathAge: toText(record.deathAge) || null,
    burialPlace,
    burialDate: toText(record.burialDate) || null,
  };

  return {
    ...payload,
    nameNormalized: normalizeName(name),
    sourcePayload: JSON.stringify(payload),
  };
});

const sourceIds = new Set(normalized.map(record => record.sourceId));
if (sourceIds.size !== normalized.length) {
  throw new Error("The source file has duplicate sourceId values");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const sql = `
  INSERT INTO somang_interment_records (
    sourceId, name, nameNormalized, role, affiliation, pastor, funeralChurch,
    birthDate, deathDate, deathAge, burialPlace, burialDate, sourcePayload
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    nameNormalized = VALUES(nameNormalized),
    role = VALUES(role),
    affiliation = VALUES(affiliation),
    pastor = VALUES(pastor),
    funeralChurch = VALUES(funeralChurch),
    birthDate = VALUES(birthDate),
    deathDate = VALUES(deathDate),
    deathAge = VALUES(deathAge),
    burialPlace = VALUES(burialPlace),
    burialDate = VALUES(burialDate),
    sourcePayload = VALUES(sourcePayload)
`;

try {
  await connection.query(
    apply ? "START TRANSACTION" : "START TRANSACTION READ ONLY"
  );

  // 이미 가족이 추모관을 만든 기록은 덮어쓰지 않는다 (2026-09-23). 추모관과
  // 연결된 기록의 성함·날짜가 바뀌면 가족이 만든 추모관과 어긋난다.
  const [existingRows] = await connection.query(
    `SELECT r.sourceId, m.id AS memorialId
       FROM somang_interment_records r
       LEFT JOIN memorials m ON m.intermentRecordId = r.id
      WHERE r.sourceId IN (?)` + (apply ? " FOR UPDATE" : ""),
    [[...sourceIds]]
  );
  const existing = new Set(existingRows.map(row => Number(row.sourceId)));
  const linked = new Set(
    existingRows
      .filter(row => row.memorialId != null)
      .map(row => Number(row.sourceId))
  );
  const writable = apply
    ? normalized.filter(record => !linked.has(record.sourceId))
    : [];
  const summary = {
    applied: apply,
    source: normalized.length,
    insert: normalized.filter(
      record => !existing.has(record.sourceId)
    ).length,
    update: normalized.filter(
      record => existing.has(record.sourceId) && !linked.has(record.sourceId)
    ).length,
    skippedLinkedToMemorial: linked.size,
  };

  for (let offset = 0; offset < writable.length; offset += 200) {
    const chunk = writable.slice(offset, offset + 200);
    for (const record of chunk) {
      await connection.execute(sql, [
        record.sourceId,
        record.name,
        record.nameNormalized,
        record.role,
        record.affiliation,
        record.pastor,
        record.funeralChurch,
        record.birthDate,
        record.deathDate,
        record.deathAge,
        record.burialPlace,
        record.burialDate,
        record.sourcePayload,
      ]);
    }
  }

  if (apply) {
    await connection.commit();
  } else {
    await connection.rollback();
  }
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (!apply) {
    process.stdout.write(
      "확인만 했습니다. 실제로 쓰려면 --apply 를 붙이세요.\n"
    );
  }
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
