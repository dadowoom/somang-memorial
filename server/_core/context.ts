import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import {
  COOKIE_NAME,
  SESSION_RENEW_AFTER_MS,
  SESSION_TTL_MS,
} from "@shared/const";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * 아직 쓰고 있는 로그인 상태를 조용히 연장합니다.
 *
 * 유지 기간을 짧게 두면 공용 컴퓨터에 방치된 세션은 만료되지만, 계속 쓰는
 * 분까지 자꾸 로그아웃되면 곤란합니다. 남은 기간이 절반 아래로 떨어졌을
 * 때만 새로 발급해, 매 요청마다 서명하고 쿠키를 쓰는 낭비를 피합니다.
 *
 * 연장에 실패해도 이번 요청은 그대로 처리합니다.
 */
async function renewSessionIfNeeded(opts: CreateExpressContextOptions) {
  try {
    const session = await sdk.readSession(opts.req);
    if (!session) return;

    const remaining = session.expiresAtMs - Date.now();
    if (remaining <= 0 || remaining > SESSION_RENEW_AFTER_MS) return;

    const renewed = await sdk.createSessionToken(session.openId, {
      name: session.name,
      expiresInMs: SESSION_TTL_MS,
    });
    opts.res.cookie(COOKIE_NAME, renewed, {
      ...getSessionCookieOptions(opts.req),
      maxAge: SESSION_TTL_MS,
    });
  } catch {
    // 연장 실패는 이번 요청에 영향을 주지 않습니다.
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (user) {
    await renewSessionIfNeeded(opts);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
