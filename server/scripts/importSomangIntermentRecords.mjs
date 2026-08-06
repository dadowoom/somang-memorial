import "dotenv/config";

import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error(
    "Usage: node importSomangIntermentRecords.mjs <records.json>"
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
  if (!name || !birthDate || !deathDate || !burialPlace.includes("소망동산")) {
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
  await connection.beginTransaction();

  for (let offset = 0; offset < normalized.length; offset += 200) {
    const chunk = normalized.slice(offset, offset + 200);
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

  await connection.commit();
  process.stdout.write(
    `${JSON.stringify({ importedRecords: normalized.length, sourceIds: sourceIds.size })}\n`
  );
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
