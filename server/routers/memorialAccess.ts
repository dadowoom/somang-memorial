import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import { canUserReadMemorial, getAdminMemorialById } from "../db";

export async function requireReadableMemorialById(input: {
  memorialId: number;
  accessToken?: string | null;
  ctx: TrpcContext;
}) {
  const memorial = await getAdminMemorialById(input.memorialId);
  if (!memorial) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "추모관을 찾을 수 없습니다.",
    });
  }

  if (!canUserReadMemorial(memorial, input.accessToken, input.ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "비공개 추모관입니다.",
    });
  }

  return memorial;
}
