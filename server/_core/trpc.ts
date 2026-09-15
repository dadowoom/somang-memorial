import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

export const INTERNAL_ERROR_CLIENT_MESSAGE =
  "서버에서 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  // 절차 안에서 난 서버 쪽 오류(DB 오류 등)의 원문은 브라우저로 보내지 않는다.
  // 원문은 서버 로그([trpc])에만 남는다 (2026-09-15).
  errorFormatter({ shape, error }) {
    if (error.code !== "INTERNAL_SERVER_ERROR") return shape;
    return { ...shape, message: INTERNAL_ERROR_CLIENT_MESSAGE };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (ctx.user.approvalStatus === "rejected") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "비활성화된 계정입니다.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (
      !ctx.user ||
      ctx.user.approvalStatus === "rejected" ||
      ctx.user.role !== 'admin'
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
