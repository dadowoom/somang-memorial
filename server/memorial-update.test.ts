import { describe, expect, it } from "vitest";
import { buildMemorialUpdateData } from "./routers";

describe("buildMemorialUpdateData", () => {
  it("keeps the published status when an approved memorial is saved as private", () => {
    const updateData = buildMemorialUpdateData(
      {
        id: 1,
        visibility: "private",
      },
      { accessPasswordHash: "existing-password-hash" }
    );

    expect(updateData).toMatchObject({ visibility: "private" });
    expect(updateData).not.toHaveProperty("status");
  });

  it("updates the publication status only when it is explicitly provided", () => {
    const updateData = buildMemorialUpdateData(
      {
        id: 1,
        visibility: "private",
        status: "published",
      },
      { accessPasswordHash: "existing-password-hash" }
    );

    expect(updateData).toMatchObject({
      visibility: "private",
      status: "published",
    });
  });
});
