import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWithKioskTimeout,
  getKioskRequestTimeoutMs,
  isKioskPathname,
  KIOSK_MUTATION_REQUEST_TIMEOUT_MS,
  KIOSK_QUERY_REQUEST_TIMEOUT_MS,
  KIOSK_REQUEST_TIMEOUT_ERROR,
} from "./kioskRequest";

afterEach(() => {
  vi.useRealTimers();
});

describe("isKioskPathname", () => {
  it("matches only kiosk routes", () => {
    expect(isKioskPathname("/kiosk")).toBe(true);
    expect(isKioskPathname("/kiosk/memorial/park-somang")).toBe(true);
    expect(isKioskPathname("/kiosks")).toBe(false);
    expect(isKioskPathname("/memorial/park-somang")).toBe(false);
  });
});

describe("getKioskRequestTimeoutMs", () => {
  it("gives mutations more time than read requests", () => {
    expect(getKioskRequestTimeoutMs("GET")).toBe(
      KIOSK_QUERY_REQUEST_TIMEOUT_MS
    );
    expect(getKioskRequestTimeoutMs("POST")).toBe(
      KIOSK_MUTATION_REQUEST_TIMEOUT_MS
    );
  });
});

describe("fetchWithKioskTimeout", () => {
  it("returns a response that arrives before the timeout", async () => {
    vi.useFakeTimers();
    const response = new Response('{"ok":true}');
    const fetchImplementation = vi.fn().mockResolvedValue(response);

    const result = await fetchWithKioskTimeout("/api/trpc", undefined, {
      timeoutMs: 100,
      fetchImplementation,
    });

    expect(result).toBe(response);
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts a request and reports a timeout after the limit", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | null | undefined;
    const fetchImplementation = vi.fn((_input, init) => {
      requestSignal = init?.signal;
      return new Promise<Response>(() => undefined);
    });
    const request = fetchWithKioskTimeout("/api/trpc", undefined, {
      timeoutMs: 100,
      fetchImplementation,
    });
    const rejection = expect(request).rejects.toMatchObject({
      name: "KioskRequestTimeoutError",
      message: KIOSK_REQUEST_TIMEOUT_ERROR,
    });

    await vi.advanceTimersByTimeAsync(100);

    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the timeout active while the response body is being read", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | null | undefined;
    const response = new Response("{}");
    const fetchImplementation = vi.fn((_input, init) => {
      requestSignal = init?.signal;
      Object.defineProperty(response, "json", {
        configurable: true,
        value: () =>
          new Promise((_, reject) => {
            requestSignal?.addEventListener("abort", () => {
              reject(requestSignal?.reason);
            });
          }),
      });
      return Promise.resolve(response);
    });
    const result = await fetchWithKioskTimeout("/api/trpc", undefined, {
      timeoutMs: 100,
      fetchImplementation,
    });
    const body = result.json();
    const rejection = expect(body).rejects.toMatchObject({
      name: "KioskRequestTimeoutError",
      message: KIOSK_REQUEST_TIMEOUT_ERROR,
    });

    await vi.advanceTimersByTimeAsync(100);

    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("forwards cancellation while the response body is being read", async () => {
    vi.useFakeTimers();
    const sourceController = new AbortController();
    let requestSignal: AbortSignal | null | undefined;
    const response = new Response("{}");
    const fetchImplementation = vi.fn((_input, init) => {
      requestSignal = init?.signal;
      Object.defineProperty(response, "json", {
        configurable: true,
        value: () =>
          new Promise((_, reject) => {
            requestSignal?.addEventListener("abort", () => {
              reject(requestSignal?.reason);
            });
          }),
      });
      return Promise.resolve(response);
    });
    const result = await fetchWithKioskTimeout(
      "/api/trpc",
      { signal: sourceController.signal },
      { timeoutMs: 1_000, fetchImplementation }
    );
    const body = result.json();

    sourceController.abort();

    await expect(body).rejects.toMatchObject({ name: "AbortError" });
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps ordinary network errors unchanged", async () => {
    vi.useFakeTimers();
    const networkError = new Error("network failed");
    const fetchImplementation = vi.fn().mockRejectedValue(networkError);

    await expect(
      fetchWithKioskTimeout("/api/trpc", undefined, {
        timeoutMs: 100,
        fetchImplementation,
      })
    ).rejects.toBe(networkError);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("forwards an existing cancellation signal", async () => {
    vi.useFakeTimers();
    const sourceController = new AbortController();
    const fetchImplementation = vi.fn(
      (_input, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("request cancelled"));
          });
        })
    );
    const request = fetchWithKioskTimeout(
      "/api/trpc",
      { signal: sourceController.signal },
      { timeoutMs: 1_000, fetchImplementation }
    );

    sourceController.abort();

    await expect(request).rejects.toThrow("request cancelled");
    expect(vi.getTimerCount()).toBe(0);
  });
});
