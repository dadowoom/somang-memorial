import { revokedSessions } from "../../drizzle/schema";
import { getDb } from "../db";

/** Check the migration before the HTTP server accepts requests. */
export async function assertRevokedSessionsTable() {
  const database = await getDb();
  if (!database) {
    throw new Error(
      "서버 시작 중단: revoked_sessions 표를 확인할 DB에 연결할 수 없습니다."
    );
  }

  try {
    await database
      .select({ sessionKey: revokedSessions.sessionKey })
      .from(revokedSessions)
      .limit(1);
  } catch {
    throw new Error(
      "서버 시작 중단: revoked_sessions 표 확인 실패. 마이그레이션 0032 먼저 적용해 주세요."
    );
  }
}
