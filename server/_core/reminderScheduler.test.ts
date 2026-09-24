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

import {
  REMINDER_MAX_TRIES,
  resetReminderTries,
  runReminderNotificationJob,
} from "./reminderScheduler";

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
  resetReminderTries();
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

  // 2026-09-24: 계속 실패하는 분께는 3번까지만 보내고 멈춘다.
  it("같은 분께 3번 모두 실패하면 올해는 멈추고 까닭을 남긴다", async () => {
    mocks.listDueReminderSubscriptions.mockResolvedValue([target(4, 2026)]);
    mocks.claimReminderNotification.mockResolvedValue(true);
    mocks.sendAlimtalk.mockRejectedValue(new Error("카카오톡 사용자 아님"));

    for (let run = 1; run <= REMINDER_MAX_TRIES; run += 1) {
      await runReminderNotificationJob(AT_10AM);
    }

    const calls = mocks.markReminderNotificationFailed.mock.calls;
    expect(calls).toHaveLength(3);
    // 1·2번째는 되돌려 다시 보내고
    expect(calls[0].slice(0, 2)).toEqual([4, 2026]);
    expect(calls[1].slice(0, 2)).toEqual([4, 2026]);
    // 3번째는 "올해 보냄"을 그대로 두어 멈추고, 까닭을 남긴다
    expect(calls[2][0]).toBe(4);
    expect(calls[2][1]).toBe(2027);
    expect(calls[2][2]).toContain("3번 실패로 올해 알림을 멈췄습니다");
  });

  it("한 분에게서 오류가 나도 나머지 분들께는 계속 보낸다", async () => {
    mocks.listDueReminderSubscriptions.mockResolvedValue([
      target(5),
      target(6),
    ]);
    mocks.claimReminderNotification.mockImplementation(async (id: number) => {
      if (id === 5) throw new Error("DB 연결 끊김");
      return true;
    });
    mocks.sendAlimtalk.mockResolvedValue({ messageId: "m6" });

    const result = await runReminderNotificationJob(AT_10AM);

    expect(mocks.markReminderNotificationSent).toHaveBeenCalledWith(
      6,
      2027,
      "m6"
    );
    expect(result).toMatchObject({ sent: 1 });
  });
});
