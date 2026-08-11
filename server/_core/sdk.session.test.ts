import { COOKIE_NAME } from "@shared/const";
import type { Request } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionAppId, sdk } from "./sdk";

vi.mock("../db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

describe("local session application identifier", () => {
  it("uses a stable internal value when OAuth is not configured", () => {
    expect(getSessionAppId("")).toBe("somang-memorial");
  });

  it("keeps the configured OAuth application identifier", () => {
    expect(getSessionAppId("configured-app")).toBe("configured-app");
  });
});

describe("authenticated user status", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps a disabled user's status across repeated requests", async () => {
    const disabledUser: User = {
      id: 7,
      openId: "disabled-user",
      name: "Disabled User",
      email: "disabled@example.com",
      passwordHash: null,
      phone: null,
      loginMethod: "email",
      role: "user",
      approvalStatus: "rejected",
      approvedAt: null,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      lastSignedIn: new Date("2026-08-01T00:00:00.000Z"),
    };

    vi.spyOn(sdk, "verifySession").mockResolvedValue({
      openId: disabledUser.openId,
      appId: "somang-memorial",
      name: disabledUser.name || "",
    });
    vi.mocked(db.getUserByOpenId).mockResolvedValue(disabledUser);
    vi.mocked(db.upsertUser).mockResolvedValue();

    const request = {
      headers: {
        cookie: `${COOKIE_NAME}=signed-session`,
      },
    } as Request;

    const firstRequest = await sdk.authenticateRequest(request);
    const secondRequest = await sdk.authenticateRequest(request);

    expect(db.upsertUser).toHaveBeenCalledTimes(2);
    expect(vi.mocked(db.upsertUser).mock.calls).toEqual([
      [
        {
          openId: disabledUser.openId,
          lastSignedIn: expect.any(Date),
        },
      ],
      [
        {
          openId: disabledUser.openId,
          lastSignedIn: expect.any(Date),
        },
      ],
    ]);
    expect(firstRequest.approvalStatus).toBe("rejected");
    expect(secondRequest.approvalStatus).toBe("rejected");
    expect(secondRequest.lastSignedIn).toBeInstanceOf(Date);
    expect(secondRequest.lastSignedIn).not.toEqual(disabledUser.lastSignedIn);
  });
});
