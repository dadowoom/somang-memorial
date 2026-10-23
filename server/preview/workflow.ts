import { PreviewGuardError } from "./guard";

export interface PreviewStore {
  databaseName(): Promise<string | null>;
  tables(): Promise<string[]>;
  marker(): Promise<string | null>;
  migrate(): Promise<void>;
  mark(value: "started" | "seeded"): Promise<void>;
  /** 시드에 쓸 비밀번호를 미리 읽고 검사한다. 지우기·마이그레이션 전에 부른다. */
  prepareSeed(): Promise<void>;
  seed(): Promise<void>;
  reset(): Promise<void>;
}

/** Every decision before the first write is based on the connected database. */
export async function runPreviewWorkflow(store: PreviewStore, reset: boolean) {
  if ((await store.databaseName()) !== "somang_workshop")
    throw new PreviewGuardError("DATABASE_URL / SELECT DATABASE()");
  let tables = await store.tables();
  // 시드가 필요한 경우(리셋·빈 DB)는 무엇이든 쓰거나 지우기 전에 준비물을 먼저 검사한다.
  if (reset || !tables.length) await store.prepareSeed();
  if (reset) {
    await store.reset();
    tables = await store.tables();
    if (tables.length) throw new PreviewGuardError("site-reset tables");
  }
  if (!tables.length) {
    await store.migrate();
    await store.mark("started");
    await store.seed();
    await store.mark("seeded");
    return;
  }
  if (!tables.includes("preview_meta") || (await store.marker()) !== "seeded") {
    throw new PreviewGuardError("preview_meta");
  }
  await store.migrate();
}

export function previewHealthStatus(ready: boolean) {
  return ready ? 200 : 503;
}
