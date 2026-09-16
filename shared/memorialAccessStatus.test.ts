import { describe, expect, it } from "vitest";
import {
  publicMemorialName,
  toMemorialAccessStatus,
} from "./memorialAccessStatus";

const row = {
  slug: "kim-somang",
  name: "김소망",
  role: "권사",
  birthDate: "1940-01-01",
  deathDate: "2024-05-05",
  church: "소망교회",
  summary: "평생 기도로 사신 분",
  visibility: "public",
  accessPasswordHash: null,
};

describe("toMemorialAccessStatus", () => {
  it("공개 추모관은 인적 사항을 그대로 돌려준다", () => {
    const status = toMemorialAccessStatus(row);
    expect(status.name).toBe("김소망");
    expect(status.summary).toBe("평생 기도로 사신 분");
    expect(status.isPrivate).toBe(false);
    expect(status.requiresPassword).toBe(false);
    expect(status.href).toBe("/memorial/kim-somang");
  });

  it("링크 공개 추모관도 링크를 받은 사람이 보는 것이므로 인적 사항을 보여 준다", () => {
    const status = toMemorialAccessStatus({ ...row, visibility: "link" });
    expect(status.name).toBe("김소망");
    expect(status.isPrivate).toBe(false);
  });

  it("비공개 추모관은 비밀번호 없이 성함·생몰·요약을 내주지 않는다", () => {
    const status = toMemorialAccessStatus({
      ...row,
      visibility: "private",
      accessPasswordHash: "hash",
    });
    expect(status.slug).toBe("kim-somang");
    expect(status.isPrivate).toBe(true);
    expect(status.requiresPassword).toBe(true);
    expect(status.name).toBeNull();
    expect(status.role).toBeNull();
    expect(status.birthDate).toBeNull();
    expect(status.deathDate).toBeNull();
    expect(status.church).toBeNull();
    expect(status.summary).toBeNull();
  });

  it("비공개인데 비밀번호가 아직 없으면 requiresPassword 는 false 다", () => {
    const status = toMemorialAccessStatus({ ...row, visibility: "private" });
    expect(status.isPrivate).toBe(true);
    expect(status.requiresPassword).toBe(false);
    expect(status.name).toBeNull();
  });
});

describe("작성 중인 추모관 (2026-09-16)", () => {
  it("전체 공개여도 인적 사항을 내주지 않고 비밀번호 칸도 띄우지 않는다", () => {
    const status = toMemorialAccessStatus({ ...row, status: "pending" });
    expect(status.isPreparing).toBe(true);
    expect(status.requiresPassword).toBe(false);
    expect(status.name).toBeNull();
    expect(status.summary).toBeNull();
  });

  it("비공개·비밀번호가 있어도 작성 중이면 비밀번호 칸을 띄우지 않는다", () => {
    const status = toMemorialAccessStatus({
      ...row,
      visibility: "private",
      accessPasswordHash: "hash",
      status: "pending",
    });
    expect(status.isPreparing).toBe(true);
    expect(status.requiresPassword).toBe(false);
  });

  it("등록을 마친 추모관은 준비 중이 아니다", () => {
    expect(
      toMemorialAccessStatus({ ...row, status: "published" }).isPreparing
    ).toBe(false);
    expect(toMemorialAccessStatus(row).isPreparing).toBe(false);
  });
});

describe("publicMemorialName", () => {
  it("비공개일 때만 이름을 감춘다", () => {
    expect(publicMemorialName("public", "김소망")).toBe("김소망");
    expect(publicMemorialName("link", "김소망")).toBe("김소망");
    expect(publicMemorialName("private", "김소망")).toBeNull();
  });
});
