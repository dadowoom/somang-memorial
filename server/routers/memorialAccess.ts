import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import { canUserReadMemorialWithFamily, getAdminMemorialById } from "../db";

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

  // 가족 초대로 함께 관리하는 가족도 비공개·확인 대기 추모관을 볼 수 있다.
  if (
    !(await canUserReadMemorialWithFamily(
      memorial,
      input.accessToken,
      input.ctx.user
    ))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "비공개 추모관입니다.",
    });
  }

  return memorial;
}
