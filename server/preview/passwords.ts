import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PreviewGuardError } from "./guard";

const names = [
  "SOMANG_FAKE_ADMIN_PASSWORD",
  "SOMANG_FAKE_USER_PASSWORD",
  "SOMANG_FAKE_PRIVATE_PASSWORD",
  "SOMANG_FAKE_ROOM_PASSWORD",
] as const;

export async function previewPasswords(env: NodeJS.ProcessEnv) {
  const file = path.join(env.STATE_DIR!, "fake-passwords.json");
  let saved: Record<string, string> = {};
  try {
    const stat = await fs.lstat(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (stat.mode & 0o777) !== 0o600
    )
      throw new PreviewGuardError("STATE_DIR/fake-passwords.json");
    saved = JSON.parse(await fs.readFile(file, "utf8"));
    if (
      !names.every(
        name => typeof saved[name] === "string" && saved[name].length > 0
      )
    )
      throw new PreviewGuardError("STATE_DIR/fake-passwords.json");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const name of names) {
    if (saved[name] && env[name]?.trim() && saved[name] !== env[name]?.trim())
      throw new PreviewGuardError(name);
  }
  const values = Object.fromEntries(
    names.map(name => [
      name,
      saved[name] || env[name]?.trim() || randomBytes(24).toString("base64url"),
    ])
  ) as Record<(typeof names)[number], string>;
  if (!Object.keys(saved).length && names.some(name => !env[name]?.trim())) {
    const handle = await fs.open(file, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(values));
    } finally {
      await handle.close();
    }
  }
  return {
    admin: values.SOMANG_FAKE_ADMIN_PASSWORD,
    user: values.SOMANG_FAKE_USER_PASSWORD,
    privateMemorial: values.SOMANG_FAKE_PRIVATE_PASSWORD,
    familyRoom: values.SOMANG_FAKE_ROOM_PASSWORD,
  };
}
