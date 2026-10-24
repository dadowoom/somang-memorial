import { AXIOS_TIMEOUT_MS, COOKIE_NAME, SESSION_TTL_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { createHash, randomUUID } from "crypto";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { credentialFingerprint } from "./sessionCredential";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const LOCAL_SESSION_APP_ID = "somang-memorial";

export class InvalidAccountSessionError extends Error {}

export function getSessionAppId(appId: string | undefined = ENV.appId) {
  return appId || LOCAL_SESSION_APP_ID;
}

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  // 발급 당시 비밀번호의 지문. 비밀번호를 바꾸면 옛 세션이 끊긴다 (2026-09-14).
  cred?: string;
  sid?: string;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    // 이 사이트는 아이디·비밀번호 로그인만 쓴다. 외부 로그인 주소가 없는 것은
    // 정상이라 기동 때마다 오류 로그를 남기지 않는다 (2026-09-15).
    if (ENV.oAuthServerUrl) {
      console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    } else {
      console.log("[OAuth] 외부 로그인 사용 안 함 (OAUTH_SERVER_URL 미설정)");
    }
  }

  private decodeState(state: string): string {
    const redirectUri = atob(state);
    return redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: {
      expiresInMs?: number;
      name?: string;
      credential?: string;
      sessionId?: string;
    } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        // Local email/admin accounts do not use Manus OAuth, so production
        // installations may not have VITE_APP_ID. Keep their signed sessions
        // valid with a stable internal application identifier.
        appId: getSessionAppId(),
        name: options.name || "",
        cred: options.credential,
        sid: options.sessionId ?? randomUUID(),
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? SESSION_TTL_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      ...(payload.cred ? { cred: payload.cred } : {}),
      ...(payload.sid ? { sid: payload.sid } : {}),
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(cookieValue: string | undefined | null): Promise<{
    openId: string;
    appId: string;
    name: string;
    cred: string | null;
    sid?: string | null;
  } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, cred, sid } = payload as Record<
        string,
        unknown
      >;

      if (
        !isNonEmptyString(openId) ||
        typeof appId !== "string" ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name,
        cred: typeof cred === "string" ? cred : null,
        sid: typeof sid === "string" ? sid : null,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  /**
   * 쿠키에 담긴 로그인 정보와 남은 기간을 읽습니다. 아직 쓰고 있는 세션을
   * 조용히 연장할지 판단하는 데 씁니다(context.ts).
   */
  async readSession(req: Request) {
    try {
      const cookies = this.parseCookies(req.headers.cookie);
      const cookieValue = cookies.get(COOKIE_NAME);
      if (!cookieValue) return null;

      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });

      const { openId, name, exp, cred, sid } = payload as Record<
        string,
        unknown
      >;
      if (typeof openId !== "string" || typeof name !== "string") return null;
      if (typeof exp !== "number") return null;

      return {
        openId,
        name,
        expiresAtMs: exp * 1000,
        cred: typeof cred === "string" ? cred : undefined,
        // 배포 전 쿠키에도 연장 후 같은 폐기 키를 쓰도록 원본 쿠키의 지문을 이어 간다.
        sid:
          typeof sid === "string"
            ? sid
            : `legacy:${this.sessionKey(cookieValue, null)}`,
      };
    } catch {
      return null;
    }
  }

  private sessionKey(cookieValue: string, sid: string | null | undefined) {
    if (sid?.startsWith("legacy:") && /^[a-f0-9]{64}$/.test(sid.slice(7))) {
      return sid.slice(7);
    }
    return createHash("sha256")
      .update(sid ? `sid:${sid}` : `cookie:${cookieValue}`)
      .digest("hex");
  }

  async revokeRequestSession(req: Request): Promise<void> {
    const cookieValue = this.parseCookies(req.headers.cookie).get(COOKIE_NAME);
    if (!cookieValue) return;
    const session = await this.readSession(req);
    if (!session) return;
    await db.revokeSession(
      this.sessionKey(cookieValue, session.sid),
      new Date(Math.max(session.expiresAtMs, Date.now() + SESSION_TTL_MS))
    );
  }

  async authenticateRequest(req: Request): Promise<User> {
    // Regular authentication flow
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    let revoked = false;
    try {
      revoked = await db.isSessionRevoked(
        this.sessionKey(sessionCookie!, session.sid)
      );
    } catch (error) {
      console.warn(
        "[Auth] Could not check session revocation; allowing session",
        error
      );
    }
    if (revoked) {
      throw ForbiddenError("Revoked session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
      throw new InvalidAccountSessionError("삭제된 계정입니다.");
    }

    if (user.approvalStatus === "rejected") {
      throw new InvalidAccountSessionError("비활성화된 계정입니다.");
    }

    // 세션에 담긴 비밀번호 지문이 지금 비밀번호와 다르면(재설정했거나, 지문이
    // 없는 옛 세션이면) 로그인으로 보지 않는다. 다시 로그인하면 된다 (2026-09-14).
    if (session.cred !== credentialFingerprint(user.passwordHash)) {
      throw ForbiddenError("Session credential mismatch");
    }

    // Approval is controlled by administrators. A routine authenticated request
    // must never reactivate a user whose account has been disabled.
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return {
      ...user,
      lastSignedIn: signedInAt,
    };
  }
}

export const sdk = new SDKServer();
