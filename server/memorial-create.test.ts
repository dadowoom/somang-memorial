import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InsertMemorial } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createMemorial: vi.fn(),
  getSomangIntermentRecordForClaim: vi.fn(),
  isMemorialFamilyMember: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";
import {
  canUserReadMemorial,
  createMemorialAccessToken,
  verifyMemorialAccessPasswordHash,
} from "./db";

const member = { id: 7, role: "user", approvalStatus: "approved" };
const caller = (user: typeof member | null = member) =>
  appRouter.createCaller({ user, req: {}, res: {} } as TrpcContext);
const input = {
  name: "김소망",
  role: "권사",
  birthDate: "1945-03-12",
  deathDate: "",
  summary: "주님과 함께한 삶을 기억합니다.",
  story: "자녀와 이웃을 위해 기도하며 살아온 믿음의 이야기를 남깁니다.",
  visibility: "public" as const,
};
const claim = {
  recordId: 31,
  name: "김소망",
  familyConfirmation: true as const,
};
const interment = {
  id: 31,
  name: "김소망",
  role: "권사",
  birthDate: "1945-03-12",
  deathDate: "2020-05-10",
  burialPlace: "소망동산",
  memorialId: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createMemorial.mockImplementation(async (data: InsertMemorial) => ({
    ...data,
    id: 42,
    slug: "family-memory",
  }));
  mocks.getSomangIntermentRecordForClaim.mockResolvedValue(interment);
  mocks.isMemorialFamilyMember.mockResolvedValue(false);
});

function savedMemorial() {
  const data = mocks.createMemorial.mock.calls[0][0] as InsertMemorial;
  return {
    slug: "family-memory",
    visibility: data.visibility!,
    status: data.status!,
    accessPasswordHash: data.accessPasswordHash ?? null,
    createdByUserId: data.createdByUserId,
  };
}

describe("회원 추모관 즉시 완성", () => {
  it("공개를 선택한 회원의 추모관은 관리자 확인 없이 방문자가 읽을 수 있다", async () => {
    const result = await caller().memorial.create(input);
    expect(result).toMatchObject({
      status: "published",
      href: "/memorial/family-memory",
      editHref: "/my/memorials/family-memory/edit",
    });
    expect(savedMemorial()).toMatchObject({
      visibility: "public",
      createdByUserId: 7,
    });
    expect(canUserReadMemorial(savedMemorial())).toBe(true);
  });

  it("비공개도 바로 완성하지만 소유자 또는 올바른 비밀번호 없이는 읽을 수 없다", async () => {
    const password = "family-only-example";
    const result = await caller().memorial.create({
      ...input,
      visibility: "private",
      accessPassword: password,
    });
    const saved = savedMemorial();
    expect(result.status).toBe("published");
    expect(saved.visibility).toBe("private");
    expect(saved.accessPasswordHash).not.toBe(password);
    expect(
      verifyMemorialAccessPasswordHash(password, saved.accessPasswordHash!)
    ).toBe(true);
    expect(result).not.toHaveProperty("accessPasswordHash");
    expect(canUserReadMemorial(saved)).toBe(false);
    expect(canUserReadMemorial(saved, null, { id: 8, role: "user" })).toBe(
      false
    );
    expect(canUserReadMemorial(saved, null, member)).toBe(true);
    const token = createMemorialAccessToken(
      saved.slug,
      saved.accessPasswordHash!
    );
    expect(canUserReadMemorial(saved, token)).toBe(true);
  });

  it("비공개 비밀번호를 생략하면 저장하지 않는다", async () => {
    await expect(
      caller().memorial.create({ ...input, visibility: "private" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createMemorial).not.toHaveBeenCalled();
  });

  it("로그인하지 않은 방문자는 만들 수 없다", async () => {
    await expect(caller(null).memorial.create(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.createMemorial).not.toHaveBeenCalled();
  });

  it("비활성화된 계정은 계속 차단한다", async () => {
    await expect(
      caller({ ...member, approvalStatus: "rejected" }).memorial.create(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createMemorial).not.toHaveBeenCalled();
  });

  it("기존 대기 상태 계정에도 추가 관리자 승인을 요구하지 않는다", async () => {
    const result = await caller({
      ...member,
      approvalStatus: "pending",
    }).memorial.create(input);
    expect(result.status).toBe("published");
  });

  it("관리자도 선택한 공개 범위로 바로 완성한다", async () => {
    const result = await caller({ ...member, role: "admin" }).memorial.create(
      input
    );
    expect(result.status).toBe("published");
    expect(savedMemorial().visibility).toBe("public");
  });

  it("요청에 소유자와 게시 상태를 끼워 넣어도 로그인한 회원의 새 추모관으로 만든다", async () => {
    const result = await caller().memorial.create({
      ...input,
      ...{ createdByUserId: 99, status: "private" },
    });
    expect(result.status).toBe("published");
    expect(savedMemorial().createdByUserId).toBe(member.id);
  });
});

describe("부모님 찾기로 만드는 추모관", () => {
  it("관리자 확인 없이 완성하고 공개 범위는 비공개로 시작한다", async () => {
    expect(await caller().parentFinder.createMemorial(claim)).toMatchObject({
      kind: "created",
    });
    const saved = savedMemorial();
    expect(saved).toMatchObject({
      status: "published",
      visibility: "private",
      createdByUserId: 7,
    });
    expect(canUserReadMemorial(saved)).toBe(false);
    expect(canUserReadMemorial(saved, null, member)).toBe(true);
  });

  it("다른 회원의 기존 비공개 추모관을 새로 만들거나 가져올 수 없다", async () => {
    mocks.getSomangIntermentRecordForClaim.mockResolvedValue({
      ...interment,
      memorialId: 42,
      memorialSlug: "existing-private",
      memorialOwnerId: 99,
      memorialVisibility: "private",
      memorialStatus: "published",
    });
    expect(await caller().parentFinder.createMemorial(claim)).toMatchObject({
      kind: "existing",
      access: "restricted",
      href: null,
      editHref: null,
    });
    expect(mocks.createMemorial).not.toHaveBeenCalled();
  });
});
