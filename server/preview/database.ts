import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";
import type { PreviewStore } from "./workflow";

export function createPreviewStore(
  databaseUrl: string
): PreviewStore & { close(): Promise<void> } {
  const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 2 });
  const db = drizzle(pool);
  let passwords: Awaited<
    ReturnType<typeof import("./passwords").previewPasswords>
  > | null = null;
  const rows = async <T>(query: string, params: unknown[] = []) =>
    (await pool.query(query, params))[0] as T[];
  return {
    async databaseName() {
      const result = await rows<{ name: string | null }>(
        "SELECT DATABASE() AS name"
      );
      return result[0]?.name ?? null;
    },
    async tables() {
      const result = await rows<{ TABLE_NAME: string }>(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"
      );
      return result.map(row => row.TABLE_NAME);
    },
    async marker() {
      const result = await rows<{ value: string }>(
        "SELECT `value` FROM `preview_meta` WHERE `key` = 'seeded' LIMIT 1"
      );
      return result[0]?.value ?? null;
    },
    async migrate() {
      await migrate(db, {
        migrationsFolder: path.join(process.cwd(), "drizzle"),
      });
    },
    async mark(value) {
      await pool.query(
        "CREATE TABLE IF NOT EXISTS `preview_meta` (`key` varchar(40) PRIMARY KEY, `value` varchar(40) NOT NULL)"
      );
      await pool.query(
        "INSERT INTO `preview_meta` (`key`, `value`) VALUES ('seeded', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        [value]
      );
    },
    async prepareSeed() {
      const { previewPasswords } = await import("./passwords");
      passwords = await previewPasswords(process.env);
    },
    async seed() {
      if (!passwords) throw new Error("prepareSeed must run before seed");
      const [{ runFakeSeed }, { createDbFakeSeedStore }] = await Promise.all([
        import("../fakeSeed"),
        import("../fakeSeedStore"),
      ]);
      await runFakeSeed(
        await createDbFakeSeedStore({ exactImages: true }),
        passwords
      );
    },
    async reset() {
      const connection = await pool.getConnection();
      try {
        const [found] = await connection.query(
          "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"
        );
        const names = (found as { TABLE_NAME: string }[]).map(
          row => row.TABLE_NAME
        );
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        try {
          for (const name of names) {
            if (!/^[a-zA-Z0-9_]+$/.test(name))
              throw new Error("invalid table name");
            await connection.query(`DROP TABLE \`${name}\``);
          }
        } finally {
          await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        }
      } finally {
        connection.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
