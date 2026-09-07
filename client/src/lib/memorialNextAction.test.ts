import { describe, expect, it } from "vitest";
import { memorialNextAction } from "./memorialNextAction";
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
  it("offers public sharing, not direct editing, after publication", () => {
    expect(memorialNextAction("published", "public", false)).toMatchObject({
      canEdit: false,
      canAddPhotos: false,
      canShare: true,
    });
  });
  it("does not offer public sharing for a privately visible published memorial", () => {
    expect(memorialNextAction("published", "private", false)).toMatchObject({
      canEdit: false,
      canAddPhotos: false,
      canShare: false,
    });
  });
  it("handles the legacy private state separately", () => {
    expect(memorialNextAction("private", "private", false)).toMatchObject({
      canEdit: true,
      canAddPhotos: false,
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
