export const KIOSK_QUERY_REQUEST_TIMEOUT_MS = 12_000;
export const KIOSK_MUTATION_REQUEST_TIMEOUT_MS = 20_000;
export const KIOSK_REQUEST_TIMEOUT_ERROR = "KIOSK_REQUEST_TIMEOUT";

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type FetchWithTimeoutOptions = {
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
};

export class KioskRequestTimeoutError extends Error {
  constructor() {
    super(KIOSK_REQUEST_TIMEOUT_ERROR);
    this.name = "KioskRequestTimeoutError";
  }
}

export function isKioskPathname(pathname: string) {
  return pathname === "/kiosk" || pathname.startsWith("/kiosk/");
}

/**
 * 로그인이 필요하다는 오류가 났을 때 로그인 화면으로 보내도 되는지 (2026-09-14).
 * 키오스크는 로그인하는 곳이 아니다. 거기서 로그인 화면으로 가면 화면 자판도
 * 처음으로 가는 버튼도 없는 곳에 관람객이 갇힌다.
 */
export function shouldRedirectToLoginOnUnauthorized(pathname: string) {
  return !isKioskPathname(pathname);
}

export function getKioskRequestTimeoutMs(method?: string) {
  return method?.toUpperCase() === "POST"
    ? KIOSK_MUTATION_REQUEST_TIMEOUT_MS
    : KIOSK_QUERY_REQUEST_TIMEOUT_MS;
}

function keepTimeoutUntilJsonIsRead(response: Response, cleanup: () => void) {
  const readJson = response.json.bind(response);

  Object.defineProperty(response, "json", {
    configurable: true,
    value: async () => {
      try {
        return await readJson();
      } finally {
        cleanup();
      }
    },
  });

  return response;
}

export async function fetchWithKioskTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithTimeoutOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? getKioskRequestTimeoutMs(init?.method);
  const fetchImplementation =
    options.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  const sourceSignal = init?.signal;
  const forwardAbort = () => controller.abort(sourceSignal?.reason);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    sourceSignal?.removeEventListener("abort", forwardAbort);
  };
  const timeoutError = new KioskRequestTimeoutError();
  const timeoutPromise = new Promise<Response>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
  });

  controller.signal.addEventListener("abort", cleanup, { once: true });

  if (sourceSignal?.aborted) {
    forwardAbort();
  } else {
    sourceSignal?.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const requestPromise = fetchImplementation(input, {
      ...(init ?? {}),
      signal: controller.signal,
    });
    const response = await Promise.race([requestPromise, timeoutPromise]);

    return keepTimeoutUntilJsonIsRead(response, cleanup);
  } catch (error) {
    cleanup();
    throw error;
  }
}
