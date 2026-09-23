import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 추모관 삭제 (2026-09-19): 만든 분·관리자만, 성함과 비밀번호를 다시 확인하고,
// 지운 뒤 더 이상 쓰이지 않게 된 사진 파일만 휴지통으로 옮긴다.
const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-for-memorial-delete-tests-012345";
  return {
    getAdminMemorialById: vi.fn(),
    verifyUserPasswordById: vi.fn(),
    deleteMemorialById: vi.fn(),
    createAdminAuditLog: vi.fn(),
    appendAdminAuditNote: vi.fn(),
    collectReferencedUploadKeys: vi.fn(),
    moveUploadsToTrash: vi.fn(),
  };
});
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return {
    ...actual,
    getAdminMemorialById: mocks.getAdminMemorialById,
    verifyUserPasswordById: mocks.verifyUserPasswordById,
    deleteMemorialById: mocks.deleteMemorialById,
    createAdminAuditLog: mocks.createAdminAuditLog,
    appendAdminAuditNote: mocks.appendAdminAuditNote,
  };
});
vi.mock("./_core/uploadCleanup", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "./_core/uploadCleanup"
  );
  return {
    ...actual,
    collectReferencedUploadKeys: mocks.collectReferencedUploadKeys,
    moveUploadsToTrash: mocks.moveUploadsToTrash,
  };
});

import { appRouter } from "./routers";

let address = 0;
const caller = (user: { id: number; role: "user" | "admin" }) =>
  appRouter.createCaller({
    user: { ...user, openId: `local:${user.id}`, name: "시험" },
    req: { headers: {}, socket: { remoteAddress: `10.9.0.${++address}` } },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  } as unknown as TrpcContext);

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return (error as { code?: string }).code ?? "UNKNOWN";
  }
};

const input = { id: 5, confirmName: "김소망", password: "pw" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminMemorialById.mockResolvedValue({
    id: 5,
    slug: "kim",
    name: "김소망",
    createdByUserId: 10,
    status: "published",
    visibility: "public",
  });
  mocks.verifyUserPasswordById.mockResolvedValue(true);
  mocks.collectReferencedUploadKeys
    .mockResolvedValueOnce(new Set(["gallery/5/a.jpg", "gallery/9/shared.jpg"]))
    .mockResolvedValueOnce(new Set(["gallery/9/shared.jpg"]));
  mocks.moveUploadsToTrash.mockReturnValue(1);
  mocks.deleteMemorialById.mockResolvedValue(77);
});

describe("추모관 삭제", () => {
  it("만든 분이 성함과 비밀번호를 맞게 넣으면 지우고, 안 쓰게 된 파일만 치운다", async () => {
    expect(
      await codeOf(caller({ id: 10, role: "user" }).memorial.delete(input))
    ).toBe("OK");
    // 지우기와 기록은 한 묶음이다 (2026-09-23, L-4).
    expect(mocks.deleteMemorialById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ action: "memorial.delete" })
    );
    expect(mocks.moveUploadsToTrash).toHaveBeenCalledWith(["gallery/5/a.jpg"]);
    // 파일 정리 결과는 그 기록에 덧붙인다.
    expect(mocks.appendAdminAuditNote).toHaveBeenCalledWith(
      77,
      " · 사진 파일 1개 정리"
    );
  });

  it("관리자도 지울 수 있다", async () => {
    expect(
      await codeOf(caller({ id: 1, role: "admin" }).memorial.delete(input))
    ).toBe("OK");
  });

  it("만든 분이 아닌 회원(초대받은 가족 포함)은 지울 수 없다", async () => {
    expect(
      await codeOf(caller({ id: 11, role: "user" }).memorial.delete(input))
    ).toBe("FORBIDDEN");
    expect(mocks.deleteMemorialById).not.toHaveBeenCalled();
  });

  it("성함이 다르면 지우지 않는다", async () => {
    const result = caller({ id: 10, role: "user" }).memorial.delete({
      ...input,
      confirmName: "김소",
    });
    expect(await codeOf(result)).toBe("BAD_REQUEST");
    expect(mocks.deleteMemorialById).not.toHaveBeenCalled();
  });

  it("비밀번호가 틀리면 지우지 않는다", async () => {
    mocks.verifyUserPasswordById.mockResolvedValue(false);
    expect(
      await codeOf(caller({ id: 10, role: "user" }).memorial.delete(input))
    ).toBe("UNAUTHORIZED");
    expect(mocks.deleteMemorialById).not.toHaveBeenCalled();
  });
});
