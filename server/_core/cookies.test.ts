import { afterEach, describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

const originalTrustProxy = process.env.TRUST_PROXY;

afterEach(() => {
  if (originalTrustProxy === undefined) {
    delete process.env.TRUST_PROXY;
  } else {
    process.env.TRUST_PROXY = originalTrustProxy;
  }
});

describe("getSessionCookieOptions", () => {
  it("does not trust a forwarded HTTPS header from a direct client", () => {
    delete process.env.TRUST_PROXY;
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    } as never);

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });

  it("uses secure cookies when the configured reverse proxy reports HTTPS", () => {
    process.env.TRUST_PROXY = "true";
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    } as never);

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });
});
