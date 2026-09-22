import { createHmac, randomInt, timingSafeEqual } from "crypto";

/**
 * 추도일 알림 본인 번호 확인 규칙 (2026-09-23).
 *
 * 알림을 신청할 때 그 번호로 카카오 알림톡 인증번호 6자리를 보내고, 맞게
 * 넣어야 신청을 저장한다. 남의 번호로 "○○님 추도일 알림"이 가지 않게 하려는 것이다.
 *
 * DB 에는 번호도 인증번호도 그대로 적지 않는다. 서버 비밀값(JWT_SECRET)으로 만든
 * 해시만 남긴다. DB 가 새어도 누구 번호인지, 인증번호가 무엇인지 바로 알 수 없다.
 */
export const VERIFY_CODE_TTL_MS = 5 * 60 * 1000;
export const VERIFY_MAX_ATTEMPTS = 5;
/** 쓰고 난 기록은 하루 뒤 지운다. */
export const VERIFY_KEEP_MS = 24 * 60 * 60 * 1000;

export function generateVerifyCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hmac(secret: string, value: string) {
  if (!secret) throw new Error("서버 비밀값이 설정되지 않았습니다.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashReminderPhone(phone: string, secret: string) {
  return hmac(secret, `reminder-phone:${phone.replace(/[^\d]/g, "")}`);
}

/** 인증번호는 번호 해시와 묶어서 해시한다. 다른 번호의 기록과 섞이지 않게. */
export function hashVerifyCode(
  phoneHash: string,
  code: string,
  secret: string
) {
  return hmac(secret, `reminder-code:${phoneHash}:${code}`);
}

export type VerifyRecord = {
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
};

export type VerifyResult = "ok" | "missing" | "expired" | "locked" | "wrong";

/**
 * 넣은 인증번호가 맞는지 판단한다. DB 는 바꾸지 않는다 (부르는 쪽이
 * "wrong" 이면 틀린 횟수를 올리고, "ok" 면 사용 표시를 한다).
 */
export function judgeVerification(
  record: VerifyRecord | null,
  codeHash: string,
  now = new Date()
): VerifyResult {
  if (!record || record.usedAt) return "missing";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (record.attempts >= VERIFY_MAX_ATTEMPTS) return "locked";
  const a = Buffer.from(record.codeHash, "hex");
  const b = Buffer.from(codeHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "wrong";
  return "ok";
}

/** 화면에 보여 줄 말. 내부 사정은 빼고, 다음에 무엇을 하면 되는지 알린다. */
export function verifyFailureMessage(result: VerifyResult, attemptsLeft = 0) {
  switch (result) {
    case "missing":
      return "인증번호를 먼저 받아 주세요.";
    case "expired":
      return "인증번호 유효 시간(5분)이 지났습니다. 인증번호를 다시 받아 주세요.";
    case "locked":
      return "인증번호를 여러 번 틀렸습니다. 인증번호를 다시 받아 주세요.";
    case "wrong":
      return attemptsLeft > 0
        ? `인증번호가 맞지 않습니다. (${attemptsLeft}번 더 넣을 수 있습니다)`
        : "인증번호를 여러 번 틀렸습니다. 인증번호를 다시 받아 주세요.";
    default:
      return "";
  }
}
