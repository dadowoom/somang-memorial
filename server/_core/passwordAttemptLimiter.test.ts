import { afterEach, describe, expect, it } from "vitest";
import {
  clientAddress,
  createPasswordAttemptLimiter,
} from "./passwordAttemptLimiter";

describe("password attempt limiter", () => {
  it("blocks the next attempt after the configured number of failures", () => {
    const limiter = createPasswordAttemptLimiter({
      failureLimit: 3,
      failureWindowMs: 1_000,
      blockMs: 5_000,
    });
    const now = 1_000;

    limiter.recordFailure("client-and-memorial", now);
    limiter.recordFailure("client-and-memorial", now + 1);
    expect(limiter.check("client-and-memorial", now + 2)).toEqual({
      allowed: true,
    });

    limiter.recordFailure("client-and-memorial", now + 2);
    expect(limiter.check("client-and-memorial", now + 3)).toEqual({
      allowed: false,
      retryAfterMs: 4_999,
    });
  });

  it("allows a client again after the temporary block expires", () => {
    const limiter = createPasswordAttemptLimiter({
      failureLimit: 1,
      blockMs: 5_000,
    });

    limiter.recordFailure("client-and-memorial", 1_000);
    expect(limiter.check("client-and-memorial", 6_001)).toEqual({
      allowed: true,
    });
  });

  it("clears previous failures after a successful password entry", () => {
    const limiter = createPasswordAttemptLimiter({ failureLimit: 2 });

    limiter.recordFailure("client-and-memorial", 1_000);
    limiter.recordSuccess("client-and-memorial");
    limiter.recordFailure("client-and-memorial", 1_001);

    expect(limiter.check("client-and-memorial", 1_002)).toEqual({
      allowed: true,
    });
  });

  it("keeps different protected items independent", () => {
    const limiter = createPasswordAttemptLimiter({ failureLimit: 1 });

    limiter.recordFailure("client-and-first-memorial", 1_000);

    expect(limiter.check("client-and-second-memorial", 1_001)).toEqual({
      allowed: true,
    });
  });
});

describe("client address behind nginx", () => {
  const original = process.env.TRUST_PROXY;
  afterEach(() => {
    if (original === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = original;
  });
  const req = (forwardedFor?: string | string[]) =>
    ({
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
      socket: { remoteAddress: "127.0.0.1" },
    }) as any;

  it("uses the address nginx appended, not one the visitor wrote", () => {
    process.env.TRUST_PROXY = "true";
    // 방문자가 "1.1.1.1" 을 적어 보내도 nginx 가 실제 주소를 뒤에 붙인다.
    expect(clientAddress(req("1.1.1.1, 203.0.113.7"))).toBe("203.0.113.7");
    expect(clientAddress(req("9.9.9.9, 203.0.113.7"))).toBe("203.0.113.7");
    expect(clientAddress(req(["1.1.1.1", "203.0.113.7"]))).toBe(
      "203.0.113.7"
    );
  });

  it("ignores forwarded headers unless a proxy is trusted", () => {
    delete process.env.TRUST_PROXY;
    expect(clientAddress(req("203.0.113.7"))).toBe("127.0.0.1");
  });
});
