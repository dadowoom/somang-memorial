import {
  checkResetFlags,
  installPreviewEnv,
  validatePreviewEnv,
} from "./guard";

let stage = "environment";
async function main() {
  const clean = validatePreviewEnv(process.env);
  const reset = checkResetFlags(process.argv.slice(2));
  installPreviewEnv(clean);
  stage = "DATABASE_URL / migration / seed";
  const { createPreviewStore } = await import("./database");
  const { runPreviewWorkflow } = await import("./workflow");
  const store = createPreviewStore(clean.DATABASE_URL!);
  try {
    await runPreviewWorkflow(store, reset);
  } finally {
    await store.close();
  }
  stage = "server";
  await import("./server");
}

main().catch(error => {
  console.error(
    `[작업장] 시작 중단: ${stage}${error?.name === "PreviewGuardError" ? ` (${error.message})` : ""}`
  );
  process.exit(1);
});
