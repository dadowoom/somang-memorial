import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/** Seed files have fixed names; write a complete replacement before publishing it. */
export async function putPreviewImage(key: string, data: Buffer) {
  if (
    !/^[a-z0-9/-]+\.png$/.test(key) ||
    key.split("/").some(part => part === "..")
  )
    throw new Error("invalid preview image key");
  const target = path.join(process.env.UPLOAD_DIR!, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, data, { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return { key, url: `/uploads/${key}` };
}
