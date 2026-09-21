import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

/**
 * 한 분이 두 줄로 나뉜 안장 기록 합치기 (2026-09-21).
 *
 * 교회 「소천자목록」 끝부분(약 500줄)은 이름과 생년월일만 적힌 보충 명단이다.
 * 본 명단에는 소천일만 있고 생년월일이 빠진 줄이 따로 있어, 같은 분이 검색하면
 * 두 줄(생년월일만 / 소천일만)로 나왔다.
 *
 * 합치는 방법: 소천일 줄(keep, 장지·담당 목사 등이 있는 쪽)에 생년월일을 채우고,
 * 생년월일만 있는 줄(remove)을 지운다. 이름이 DB 전체에서 이 두 줄뿐인 "확실한"
 * 짝만 계획에 넣는다(계획은 밖에서 만든다). 여기서는 적용 직전에 다시 확인한다.
 *
 *   node scripts/mergeSplitIntermentRecords.mjs plan.json          # 확인만
 *   node scripts/mergeSplitIntermentRecords.mjs plan.json --apply  # 적용
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const personName = value =>
  String(value ?? "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)[0] ?? "";

export function checkPair(plan, keep, remove) {
  if (!keep || !remove) return "기록을 찾을 수 없음";
  if (keep.id === remove.id) return "같은 기록";
  if (personName(keep.name) !== personName(remove.name)) return "이름이 다름";
  if (!keep.birthDate.startsWith("0000")) return "남길 줄에 이미 생년월일이 있음";
  if (keep.deathDate === "0000-00-00" || !DATE.test(keep.deathDate))
    return "남길 줄에 소천일이 없음";
  if (remove.deathDate !== "0000-00-00") return "지울 줄에 소천일이 있음";
  if (remove.birthDate !== plan.birthDate || !DATE.test(plan.birthDate))
    return "생년월일이 계획과 다름";
  if (keep.memorialId || remove.memorialId) return "추모관이 연결됨";
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  if (args.length !== (apply ? 2 : 1)) {
    throw Error("Usage: mergeSplitIntermentRecords.mjs plan.json [--apply]");
  }
  const plan = JSON.parse(await fs.readFile(args[0], "utf8"));
  if (!Array.isArray(plan)) throw Error("plan must be an array");
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ quiet: true });
  const { default: mysql } = await import("mysql2/promise");
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await c.query(apply ? "START TRANSACTION" : "START TRANSACTION READ ONLY");
    const ids = plan.flatMap(p => [p.keepId, p.removeId]);
    const [rows] = await c.query(
      `SELECT r.id, r.name, r.birthDate, r.deathDate, m.id AS memorialId
         FROM somang_interment_records r
         LEFT JOIN memorials m ON m.intermentRecordId = r.id
        WHERE r.id IN (?)` + (apply ? " FOR UPDATE" : ""),
      [ids]
    );
    const byId = new Map(rows.map(r => [r.id, r]));
    const problems = [];
    for (const p of plan) {
      const why = checkPair(p, byId.get(p.keepId), byId.get(p.removeId));
      if (why) problems.push({ keepId: p.keepId, removeId: p.removeId, why });
    }
    // 한 건이라도 이상하면 아무것도 바꾸지 않는다.
    if (problems.length > 0) {
      await c.rollback();
      console.log(JSON.stringify({ applied: false, problems }));
      process.exitCode = 1;
      return;
    }
    if (apply) {
      for (const p of plan) {
        await c.execute(
          "UPDATE somang_interment_records SET birthDate = ? WHERE id = ?",
          [p.birthDate, p.keepId]
        );
        await c.execute("DELETE FROM somang_interment_records WHERE id = ?", [
          p.removeId,
        ]);
      }
      await c.commit();
    } else {
      await c.rollback();
    }
    console.log(JSON.stringify({ applied: apply, merged: plan.length }));
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    await c.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error("Merge stopped. Nothing committed.", error?.message ?? error);
    process.exitCode = 1;
  });
}
