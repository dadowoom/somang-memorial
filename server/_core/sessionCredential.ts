import { createHash } from "node:crypto";

/**
 * 로그인 상태(세션)에 "그때의 비밀번호"를 알아볼 수 있는 짧은 지문을 넣는다.
 *
 * 비밀번호를 재설정하면 저장된 해시가 바뀌고, 그러면 옛 세션의 지문과 달라져
 * 옛 로그인이 전부 끊긴다. 계정을 빼앗겼을 때 비밀번호만 바꾸면 침입자도
 * 함께 로그아웃되게 하려는 것이다 (2026-09-14).
 *
 * 지문은 해시의 해시라 비밀번호는 물론 저장된 해시도 되돌릴 수 없다.
 * 외부 로그인 계정처럼 비밀번호가 없으면 빈 값의 지문을 쓴다.
 */
export function credentialFingerprint(passwordHash: string | null | undefined) {
  return createHash("sha256")
    .update(`somang-session-credential:${passwordHash ?? ""}`)
    .digest("base64url")
    .slice(0, 16);
}
