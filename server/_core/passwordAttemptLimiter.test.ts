import { describe, expect, it } from "vitest";
import { createPasswordAttemptLimiter } from "./passwordAttemptLimiter";

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
