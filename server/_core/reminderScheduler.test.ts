import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listDueReminderSubscriptions: vi.fn(),
  claimReminderNotification: vi.fn(),
  markReminderNotificationSent: vi.fn(),
  markReminderNotificationFailed: vi.fn(),
  sendAlimtalk: vi.fn(),
  enabled: true,
}));

vi.mock("../db", () => ({
  listDueReminderSubscriptions: mocks.listDueReminderSubscriptions,
  claimReminderNotification: mocks.claimReminderNotification,
  markReminderNotificationSent: mocks.markReminderNotificationSent,
  markReminderNotificationFailed: mocks.markReminderNotificationFailed,
}));
vi.mock("./alimtalk", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./alimtalk");
  return {
    ...actual,
    getAlimtalkConfigStatus: () => ({ enabled: mocks.enabled }),
    sendAlimtalk: mocks.sendAlimtalk,
  };
});

import { runReminderNotificationJob } from "./reminderScheduler";

// 가짜 대상. 실제 번호·성함이 아니다.
const target = (id: number, lastNotifiedYear: number | null = 2026) => ({
  id,
  phone: "01000000000",
  memorialDay: "매년 05월 22일",
  lastNotifiedYear,
  memorialSlug: "gasang",
  memorialName: "가상인",
  memorialRole: "권사",
  notificationYear: 2027,
});
const AT_10AM = new Date("2027-05-21T01:00:00Z"); // 서울 10:00

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled = true;
  mocks.markReminderNotificationSent.mockResolvedValue(undefined);
  mocks.markReminderNotificationFailed.mockResolvedValue(undefined);
});

describe("추도일 하루 전 알림 보내기", () => {
  it("먼저 '보냄'을 찍은 분께만 보낸다 — 이미 누가 가져간 분은 건너뛴다", async () => {
    mocks.listDueReminderSubscriptions.mockResolvedValue([
      target(1),
      target(2),
    ]);
    mocks.claimReminderNotification.mockImplementation(
      async (id: number) => id === 1
    );
    mocks.sendAlimtalk.mockResolvedValue({ messageId: "m1" });

    const result = await runReminderNotificationJob(AT_10AM);

    expect(mocks.sendAlimtalk).toHaveBeenCalledTimes(1);
    expect(mocks.markReminderNotificationSent).toHaveBeenCalledWith(
      1,
      2027,
      "m1"
    );
    expect(result).toMatchObject({ sent: 1, failed: 0 });
  });

  it("보내다 실패하면 '보냄' 표시를 되돌려 다음 시간에 다시 보내게 한다", async () => {
    mocks.listDueReminderSubscriptions.mockResolvedValue([target(3, 2026)]);
    mocks.claimReminderNotification.mockResolvedValue(true);
    mocks.sendAlimtalk.mockRejectedValue(
      new Error("알림톡 발송 실패 (code -99)")
    );

    const result = await runReminderNotificationJob(AT_10AM);

    expect(mocks.markReminderNotificationFailed).toHaveBeenCalledWith(
      3,
      2026,
      "알림톡 발송 실패 (code -99)"
    );
    expect(mocks.markReminderNotificationSent).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: 0, failed: 1 });
  });

  it("밤에는 아무에게도 보내지 않는다", async () => {
    const result = await runReminderNotificationJob(
      new Date("2027-05-21T14:00:00Z") // 서울 23:00
    );
    expect(result.skipped).toBe(true);
    expect(mocks.listDueReminderSubscriptions).not.toHaveBeenCalled();
  });

  it("알림톡 설정이 끝나지 않았으면 보내지 않는다", async () => {
    mocks.enabled = false;
    const result = await runReminderNotificationJob(AT_10AM);
    expect(result.skipped).toBe(true);
    expect(mocks.sendAlimtalk).not.toHaveBeenCalled();
  });
});
