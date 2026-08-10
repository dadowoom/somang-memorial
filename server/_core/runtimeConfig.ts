type RuntimeEnvironment = Record<string, string | undefined>;

function isProduction(environment: RuntimeEnvironment) {
  return environment.NODE_ENV === "production";
}

/**
 * Refuse to boot a public server with the two secrets it cannot operate
 * safely without.  The values themselves are never included in errors.
 */
export function validateRuntimeConfig(environment: RuntimeEnvironment) {
  if (!isProduction(environment)) return;

  const missing: string[] = [];
  if (!environment.DATABASE_URL?.trim()) missing.push("DATABASE_URL");

  const sessionSecret = environment.JWT_SECRET?.trim() ?? "";
  if (sessionSecret.length < 32) missing.push("JWT_SECRET (32자 이상)");

  if (missing.length > 0) {
    throw new Error(
      `Production startup blocked: ${missing.join(", ")} 환경 설정이 필요합니다.`
    );
  }

  const port = Number(environment.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Production startup blocked: PORT 값이 올바르지 않습니다.");
  }
}
