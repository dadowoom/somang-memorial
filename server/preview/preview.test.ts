import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { checkResetFlags, validatePreviewEnv } from "./guard";
import {
  previewHealthStatus,
  runPreviewWorkflow,
  type PreviewStore,
} from "./workflow";

const valid = (): NodeJS.ProcessEnv => ({
  SOMANG_FAKE: "1",
  NODE_ENV: "production",
  HOST: "0.0.0.0",
  PORT: "3000",
  DATABASE_URL: "mysql://preview:fake-password@db:3306/somang_workshop",
  JWT_SECRET: "x".repeat(32),
  PUBLIC_SITE_URL: "https://somang-preview.dadowoomtest.co.kr",
  UPLOAD_DIR: "/data/uploads",
  STATE_DIR: "/data/state",
  SMTP_HOST: "mail",
  SMTP_PORT: "1025",
  SMTP_FROM: "preview@preview.invalid",
  SMTP_SECURE: "false",
  SMTP_REQUIRE_TLS: "false",
  REMINDER_SCHEDULER_ENABLED: "false",
  LETTER_NOTICE_ENABLED: "false",
  TRUST_PROXY: "1",
  COOKIE_SECURE: "1",
});

describe("preview guard", () => {
  it("requires fake mode and rejects even empty forbidden variables", () => {
    expect(() =>
      validatePreviewEnv({ ...valid(), SOMANG_FAKE: undefined })
    ).toThrow("SOMANG_FAKE");
    for (const key of [
      "ALIGO_API_KEY",
      "AWS_ACCESS_KEY_ID",
      "SMTP_PASSWORD",
      "DOTENV_CONFIG_PATH",
      "NODE_OPTIONS",
      "PREVIEW_PEER_TOKEN",
      "OPENAI_API_KEY",
    ]) {
      expect(() => validatePreviewEnv({ ...valid(), [key]: "" })).toThrow(key);
    }
  });
  it("rejects outside mail, address, scheduler, and DB settings before a connection exists", () => {
    for (const [key, value] of [
      ["REMINDER_SCHEDULER_ENABLED", "true"],
      ["SMTP_HOST", "smtp.gmail.com"],
      ["PUBLIC_SITE_URL", "https://somangmemorial.co.kr"],
      ["DATABASE_URL", "mysql://u:p@localhost:3306/somang_workshop"],
      ["DATABASE_URL", "mysql://u:p@db:3306/app"],
    ])
      expect(() => validatePreviewEnv({ ...valid(), [key]: value })).toThrow(
        key
      );
  });
  it("requires both explicit reset flags", () => {
    expect(() => checkResetFlags(["--site-reset"])).toThrow();
    expect(() => checkResetFlags(["--confirm-site-reset"])).toThrow();
    expect(checkResetFlags(["--site-reset", "--confirm-site-reset"])).toBe(
      true
    );
  });
});

function memoryStore(
  initial: string[] = [],
  value: string | null = null,
  dbName = "somang_workshop",
  prepareFails = false
) {
  const events: string[] = [];
  let tables = [...initial];
  let marker = value;
  const store: PreviewStore = {
    async databaseName() {
      events.push("database");
      return dbName;
    },
    async tables() {
      events.push("tables");
      return tables;
    },
    async marker() {
      events.push("marker");
      return marker;
    },
    async migrate() {
      events.push("migrate");
      tables = ["users", "preview_meta"];
    },
    async mark(next) {
      events.push(`mark:${next}`);
      marker = next;
    },
    async prepareSeed() {
      events.push("prepare");
      if (prepareFails) throw new Error("bad password file");
    },
    async seed() {
      events.push("seed");
    },
    async reset() {
      events.push("reset");
      tables = [];
    },
  };
  return { store, events };
}

describe("preview first start", () => {
  it("migrates, seeds, and marks an empty database in order", async () => {
    const { store, events } = memoryStore();
    await runPreviewWorkflow(store, false);
    expect(events).toEqual([
      "database",
      "tables",
      "prepare",
      "migrate",
      "mark:started",
      "seed",
      "mark:seeded",
    ]);
  });
  it("only migrates when seeded, and refuses half-finished data without writes", async () => {
    const seeded = memoryStore(["users", "preview_meta"], "seeded");
    await runPreviewWorkflow(seeded.store, false);
    expect(seeded.events).toEqual(["database", "tables", "marker", "migrate"]);
    for (const broken of [
      memoryStore(["users"]),
      memoryStore(["users", "preview_meta"], "started"),
    ]) {
      await expect(runPreviewWorkflow(broken.store, false)).rejects.toThrow();
      expect(broken.events).not.toContain("migrate");
      expect(broken.events).not.toContain("seed");
    }
  });
  it("checks seed inputs before a reset drops anything", async () => {
    const { store, events } = memoryStore(
      ["users", "preview_meta"],
      "seeded",
      "somang_workshop",
      true
    );
    await expect(runPreviewWorkflow(store, true)).rejects.toThrow(
      "bad password file"
    );
    expect(events).toEqual(["database", "tables", "prepare"]);
  });
  it("refuses a wrong connected DB before any write", async () => {
    const { store, events } = memoryStore([], null, "production");
    await expect(runPreviewWorkflow(store, false)).rejects.toThrow();
    expect(events).toEqual(["database"]);
  });
  it("reports unavailable until ready", () => {
    expect(previewHealthStatus(false)).toBe(503);
    expect(previewHealthStatus(true)).toBe(200);
  });
  it("keeps the production build command and healthz route unchanged", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts.build).toBe(
      "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
    );
    expect(readFileSync("server/_core/index.ts", "utf8")).toContain(
      'app.get("/healthz"'
    );
  });
});
