import { describe, expect, it } from "vitest";
import { validateRuntimeConfig } from "./runtimeConfig";

describe("validateRuntimeConfig", () => {
  it("allows local development without production secrets", () => {
    expect(() => validateRuntimeConfig({ NODE_ENV: "development" })).not.toThrow();
  });

  it("requires a database URL and strong session secret in production", () => {
    expect(() => validateRuntimeConfig({ NODE_ENV: "production" })).toThrow(
      "DATABASE_URL"
    );
    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "mysql://example",
        JWT_SECRET: "too-short",
      })
    ).toThrow("JWT_SECRET");
  });

  it("rejects an invalid production port", () => {
    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "mysql://example",
        JWT_SECRET: "a".repeat(32),
        PORT: "not-a-port",
      })
    ).toThrow("PORT");
  });
});
