import { describe, expect, it } from "vitest";
import { memorialNextAction } from "./memorialNextAction";

// 2026-09-12 결정: 게시된 뒤에도 만든 가족이 글과 사진을 직접 고친다.
describe("member actions match the publication state", () => {
  it.each(["public", "private"])(
    "lets a member prepare pending %s memorials but not share publicly",
    visibility => {
      expect(memorialNextAction("pending", visibility, false)).toMatchObject({
        canEdit: true,
        canAddPhotos: true,
        canShare: false,
      });
    }
  );
  it("keeps direct editing and offers public sharing after publication", () => {
    expect(memorialNextAction("published", "public", false)).toMatchObject({
      canEdit: true,
      canAddPhotos: true,
      canShare: true,
    });
  });
  it("keeps direct editing but no public sharing for a privately visible published memorial", () => {
    expect(memorialNextAction("published", "private", false)).toMatchObject({
      canEdit: true,
      canAddPhotos: true,
      canShare: false,
    });
  });
  it("lets the owner keep editing a memorial an admin set to private", () => {
    expect(memorialNextAction("private", "private", false)).toMatchObject({
      canEdit: true,
      canAddPhotos: true,
      canShare: false,
    });
  });
  it("fails closed for unknown publication states", () => {
    expect(memorialNextAction("unknown", "public", false)).toMatchObject({
      canEdit: false,
      canAddPhotos: false,
      canShare: false,
    });
  });
  it("retains the administrator's edit controls", () => {
    expect(memorialNextAction("published", "private", true)).toMatchObject({
      canEdit: true,
      canAddPhotos: true,
    });
  });
});
