import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// 관리자 화면에서 안장 기록 고치기 (2026-09-23). DB 는 가짜로 대신한다.
const mocks = vi.hoisted(() => ({
  searchIntermentRecordsForAdmin: vi.fn(),
  updateIntermentRecordByAdmin: vi.fn(),
  createIntermentRecordByAdmin: vi.fn(),
  deleteIntermentRecordByAdmin: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const admin = { id: 1, role: "admin", approvalStatus: "approved" };
const member = { id: 7, role: "user", approvalStatus: "approved" };
const caller = (user: typeof admin | null) =>
  appRouter.createCaller({
    user,
    req: { headers: {}, socket: {} },
    res: {},
  } as unknown as TrpcContext);

const fields = {
  name: "김소망",
  role: "권사",
  affiliation: "",
  pastor: "",
  funeralChurch: "",
  birthDate: "1933.1.5",
  deathDate: "2020-05-22",
  deathAge: "",
  burialPlace: "소망동산",
  burialDate: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateIntermentRecordByAdmin.mockResolvedValue({ changes: ["x"] });
  mocks.createIntermentRecordByAdmin.mockResolvedValue(501);
  mocks.deleteIntermentRecordByAdmin.mockResolvedValue({ ok: true });
});

describe("intermentAdmin", () => {
  it("관리자가 아니면 찾기·고치기·넣기·지우기 모두 막힌다", async () => {
    for (const user of [member, null]) {
      await expect(
        caller(user).intermentAdmin.search({ keyword: "김" })
      ).rejects.toThrow();
      await expect(
        caller(user).intermentAdmin.update({ id: 3, fields })
      ).rejects.toThrow();
      await expect(
        caller(user).intermentAdmin.create({ fields })
      ).rejects.toThrow();
      await expect(
        caller(user).intermentAdmin.delete({ id: 3 })
      ).rejects.toThrow();
    }
    expect(mocks.updateIntermentRecordByAdmin).not.toHaveBeenCalled();
    expect(mocks.createIntermentRecordByAdmin).not.toHaveBeenCalled();
    expect(mocks.deleteIntermentRecordByAdmin).not.toHaveBeenCalled();
  });

  it("다듬은 값(날짜 모양 맞춤)으로 고치고 관리자 번호를 남긴다", async () => {
    await caller(admin).intermentAdmin.update({ id: 3, fields });
    expect(mocks.updateIntermentRecordByAdmin).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        name: "김소망",
        birthDate: "1933-01-05",
        role: "권사",
        affiliation: null,
        burialDate: null,
      }),
      { adminUserId: 1 }
    );
  });

  it("틀린 날짜는 저장하지 않고 까닭을 알려 준다", async () => {
    await expect(
      caller(admin).intermentAdmin.create({
        fields: { ...fields, birthDate: "1933-02-30" },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("생년월일"),
    });
    expect(mocks.createIntermentRecordByAdmin).not.toHaveBeenCalled();
  });

  it("없는 기록을 고치면 없다고 답한다", async () => {
    mocks.updateIntermentRecordByAdmin.mockResolvedValue(null);
    await expect(
      caller(admin).intermentAdmin.update({ id: 999, fields })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("추모관이 연결된 기록은 지우지 않고 까닭을 알려 준다", async () => {
    mocks.deleteIntermentRecordByAdmin.mockResolvedValue({
      ok: false,
      reason: "linked",
    });
    await expect(
      caller(admin).intermentAdmin.delete({ id: 3 })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("새로 넣으면 새 기록 번호를 돌려준다", async () => {
    await expect(
      caller(admin).intermentAdmin.create({ fields })
    ).resolves.toEqual({ id: 501 });
  });
});
