/**
 * 이미 서버에 올라가 있는 사진에서 위치정보 등 숨은 정보를 일괄 제거합니다.
 *
 * 새 업로드에 쓰는 것과 "완전히 같은" 로직(server/_core/imageMetadata.ts)을
 * 재사용합니다. 그림 자체는 그대로 두고, EXIF(촬영 위치·시각)·XMP 같은 숨은
 * 정보만 떼어냅니다. 색상 프로필은 보존합니다.
 *
 * 사용법:
 *   pnpm exec tsx scripts/strip-existing-photo-metadata.ts            # 미리보기(안 바꿈)
 *   pnpm exec tsx scripts/strip-existing-photo-metadata.ts --apply    # 실제 적용
 *   UPLOAD_DIR=/some/path pnpm exec tsx scripts/strip-existing-photo-metadata.ts --apply
 *   pnpm exec tsx scripts/strip-existing-photo-metadata.ts --dir ./uploads   # 폴더 지정(시험용)
 *
 * ⚠️ 실제 적용(--apply) 전에 반드시 사진을 백업하세요(scripts/backup.sh).
 *    원본을 덮어쓰며, 되돌릴 수 없습니다.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  detectImageFormat,
  stripImageMetadata,
} from "../server/_core/imageMetadata";

// backup.sh 와 같은 기본 경로. UPLOAD_DIR 환경변수나 --dir 로 덮어쓸 수 있습니다.
const DEFAULT_UPLOAD_DIR = "/var/www/somang-memorial/uploads";

type Options = { apply: boolean; dir?: string };

function parseArgs(argv: string[]): Options {
  const options: Options = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--dir 뒤에 사진 폴더 경로를 입력해 주세요.");
      }
      options.dir = value;
      i += 1;
    } else if (arg.startsWith("--dir=")) {
      const value = arg.slice("--dir=".length);
      if (!value) throw new Error("--dir= 뒤에 사진 폴더 경로를 입력해 주세요.");
      options.dir = value;
    } else {
      throw new Error(`알 수 없는 옵션입니다: ${arg}`);
    }
  }
  return options;
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
  }
}

// 중간에 멈춰도 원본이 반쪽 나지 않도록, 임시 파일에 쓴 뒤 자리바꿈합니다.
async function writeInPlace(file: string, data: Buffer): Promise<void> {
  const stat = await fs.stat(file);
  const tmp = `${file}.metastrip-${process.pid}.tmp`;
  await fs.writeFile(tmp, data, { mode: stat.mode });
  await fs.rename(tmp, file);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  const { apply, dir } = parseArgs(process.argv.slice(2));
  const uploadDir = dir || process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;

  try {
    const stat = await fs.stat(uploadDir);
    if (!stat.isDirectory()) throw new Error("폴더가 아닙니다");
  } catch (error) {
    console.error(`사진 폴더를 열 수 없습니다: ${uploadDir} (${errorMessage(error)})`);
    process.exit(1);
    return;
  }

  console.log(`대상 폴더: ${uploadDir}`);
  console.log(
    apply
      ? "모드: 실제 적용(--apply) — 원본을 덮어씁니다."
      : "모드: 미리보기 — 바꾸지 않습니다. 실제로 지우려면 --apply 를 붙이세요."
  );
  console.log("");

  let scanned = 0;
  let changed = 0;
  let skipped = 0;
  let failed = 0;
  let bytesSaved = 0;

  for await (const file of walkFiles(uploadDir)) {
    scanned += 1;
    const shown = path.relative(uploadDir, file) || path.basename(file);

    let original: Buffer;
    try {
      original = await fs.readFile(file);
    } catch (error) {
      failed += 1;
      console.warn(`읽기 실패, 건너뜀: ${shown} (${errorMessage(error)})`);
      continue;
    }

    // 사진이 아니면 손대지 않습니다.
    if (!detectImageFormat(original)) {
      skipped += 1;
      continue;
    }

    let cleaned: Buffer;
    try {
      cleaned = stripImageMetadata(original);
    } catch (error) {
      failed += 1;
      console.warn(`처리 실패, 건너뜀: ${shown} (${errorMessage(error)})`);
      continue;
    }

    // 지울 게 없으면(내용이 동일하면) 파일을 다시 쓰지 않습니다.
    // 그래야 수정 시각이 안 바뀌어 매일 백업이 전체를 다시 올리지 않습니다.
    if (cleaned.length === original.length && cleaned.equals(original)) {
      skipped += 1;
      continue;
    }

    const saved = original.length - cleaned.length;

    if (apply) {
      try {
        await writeInPlace(file, cleaned);
      } catch (error) {
        failed += 1;
        console.warn(`쓰기 실패, 건너뜀: ${shown} (${errorMessage(error)})`);
        continue;
      }
      console.log(`지움: ${shown}  (-${saved} bytes)`);
    } else {
      console.log(`지울 예정: ${shown}  (-${saved} bytes)`);
    }

    changed += 1;
    bytesSaved += Math.max(0, saved);
  }

  console.log("");
  console.log("── 요약 ──");
  console.log(`검사한 파일: ${scanned}`);
  console.log(`${apply ? "숨은 정보를 지운 사진" : "지울 사진"}: ${changed}  (절약 ${bytesSaved} bytes)`);
  console.log(`건너뜀(사진 아님 또는 지울 것 없음): ${skipped}`);
  console.log(`실패: ${failed}`);

  if (failed > 0) {
    console.error("일부 사진을 처리하지 못했습니다. 위 실패 항목을 확인해 주세요.");
    process.exitCode = 1;
  }

  if (!apply && changed > 0) {
    console.log("");
    console.log(
      "실제로 지우려면: 먼저 사진을 백업(scripts/backup.sh)한 뒤 --apply 로 다시 실행하세요."
    );
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
