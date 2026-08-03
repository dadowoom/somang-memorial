export const KIOSK_CONNECTION_ERROR_MESSAGE =
  "연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";

export function getKioskErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;

  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function getKioskPasswordErrorMessage(error: unknown) {
  const code = getKioskErrorCode(error);

  if (code === "UNAUTHORIZED") return "비밀번호가 맞지 않습니다.";
  if (code === "NOT_FOUND") return "추모관을 찾을 수 없습니다.";
  if (code === "TOO_MANY_REQUESTS") {
    return "비밀번호를 여러 번 잘못 입력했습니다. 잠시 후 다시 시도해주세요.";
  }

  return KIOSK_CONNECTION_ERROR_MESSAGE;
}
