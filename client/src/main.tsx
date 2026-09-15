import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { installChunkReloadHandler } from "./lib/chunkReload";
import {
  fetchWithKioskTimeout,
  isKioskPathname,
  shouldRedirectToLoginOnUnauthorized,
} from "./lib/kioskRequest";
import "./index.css";

// 배포 직후 옛 탭이 새 화면 조각을 못 받으면 한 번 새로고침한다 (2026-09-15).
installChunkReloadHandler();

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  // 키오스크에서는 로그인 화면으로 끌고 가지 않는다 (관람객이 갇힌다).
  if (!shouldRedirectToLoginOnUnauthorized(window.location.pathname)) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const requestInit = {
          ...(init ?? {}),
          credentials: "include",
        } satisfies RequestInit;

        if (
          typeof window !== "undefined" &&
          isKioskPathname(window.location.pathname)
        ) {
          return fetchWithKioskTimeout(input, requestInit);
        }

        return globalThis.fetch(input, requestInit);
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
