import { beforeEach, describe, expect, it, vi } from "vitest";

// 새 편지 알림톡 발송 규칙 (2026-09-23). DB 와 알리고는 가짜로 대신한다.
const mocks = vi.hoisted(() => {
  process.env.LETTER_NOTICE_ENABLED = "true";
  process.env.ALIGO_TPL_LETTER_NOTICE = "UL_TEST_LETTER";
  return {
    listLetterNoticeCandidates: vi.fn(),
    listLetterNoticeRecipients: vi.fn(),
    claimLetterNotice: vi.fn(),
    revertLetterNotice: vi.fn(),
    skipLetterNotice: vi.fn(),
    sendAlimtalk: vi.fn(),
    getAlimtalkConfigStatus: vi.fn(),
  };
});
vi.mock("../db", () => ({
  listLetterNoticeCandidates: mocks.listLetterNoticeCandidates,
  listLetterNoticeRecipients: mocks.listLetterNoticeRecipients,
  claimLetterNotice: mocks.claimLetterNotice,
  revertLetterNotice: mocks.revertLetterNotice,
  skipLetterNotice: mocks.skipLetterNotice,
}));
vi.mock("./alimtalk", async () => {
  const actual =
    await vi.importActual<typeof import("./alimtalk")>("./alimtalk");
  return {
    ...actual,
    sendAlimtalk: mocks.sendAlimtalk,
    getAlimtalkConfigStatus: mocks.getAlimtalkConfigStatus,
  };
});

import { runLetterNoticeJob, seoulDateKey } from "./letterNoticeScheduler";

// 서울 2026-09-24 오전 10시 / 밤 11시
const MORNING = new Date("2026-09-24T01:00:00Z");
const NIGHT = new Date("2026-09-24T14:00:00Z");

const candidate = {
  memorialId: 5,
  memorialSlug: "kim-somang",
  memorialName: "김소망",
  memorialRole: "권사",
  lastLetterId: 30,
  lastSentDate: "2026-09-23",
  maxLetterId: 33,
  newCount: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAlimtalkConfigStatus.mockReturnValue({ enabled: true });
  mocks.listLetterNoticeCandidates.mockResolvedValue([candidate]);
  mocks.listLetterNoticeRecipients.mockResolvedValue([
    { userId: 7, phone: "01000000001" },
    { userId: 9, phone: "01000000002" },
  ]);
  mocks.claimLetterNotice.mockResolvedValue(true);
  mocks.sendAlimtalk.mockResolvedValue({ messageId: "m1" });
});

describe("새 편지 알림 보내기", () => {
  it("서울 날짜를 2026-09-24 모양으로 만든다", () => {
    expect(seoulDateKey(MORNING)).toBe("2026-09-24");
    // 서울은 이미 다음 날
    expect(seoulDateKey(new Date("2026-09-23T16:30:00Z"))).toBe("2026-09-24");
  });

  it("먼저 '여기까지 알렸음'을 적고 가족 모두에게 새 편지 수를 보낸다", async () => {
    await expect(runLetterNoticeJob(MORNING)).resolves.toEqual({
      sent: 2,
      failed: 0,
      skipped: false,
    });
    expect(mocks.listLetterNoticeCandidates).toHaveBeenCalledWith("2026-09-24");
    expect(mocks.claimLetterNotice).toHaveBeenCalledWith({
      memorialId: 5,
      expectLastLetterId: 30,
      expectSentDate: "2026-09-23",
      lastLetterId: 33,
      today: "2026-09-24",
    });
    const [phone, message] = mocks.sendAlimtalk.mock.calls[0];
    expect(phone).toBe("01000000001");
    expect(message.message).toContain(
      "김소망 권사님 추모관에 새 편지 3통이 도착했습니다."
    );
    expect(mocks.sendAlimtalk).toHaveBeenCalledTimes(2);
    expect(mocks.revertLetterNotice).not.toHaveBeenCalled();
  });

  it("밤에는 보내지 않는다", async () => {
    await expect(runLetterNoticeJob(NIGHT)).resolves.toMatchObject({
      skipped: true,
    });
    expect(mocks.listLetterNoticeCandidates).not.toHaveBeenCalled();
  });

  it("알림톡 설정이 덜 끝났으면 보내지 않는다", async () => {
    mocks.getAlimtalkConfigStatus.mockReturnValue({ enabled: false });
    await expect(runLetterNoticeJob(MORNING)).resolves.toMatchObject({
      skipped: true,
    });
    expect(mocks.sendAlimtalk).not.toHaveBeenCalled();
  });

  it("다른 쪽이 먼저 적었으면(이미 보냈으면) 보내지 않는다", async () => {
    mocks.claimLetterNotice.mockResolvedValue(false);
    await runLetterNoticeJob(MORNING);
    expect(mocks.sendAlimtalk).not.toHaveBeenCalled();
  });

  it("한 통도 못 보냈으면 되돌려서 다음 차례에 다시 보낸다", async () => {
    mocks.sendAlimtalk.mockRejectedValue(new Error("알리고 오류"));
    await expect(runLetterNoticeJob(MORNING)).resolves.toMatchObject({
      sent: 0,
      failed: 2,
    });
    expect(mocks.revertLetterNotice).toHaveBeenCalledWith({
      memorialId: 5,
      lastLetterId: 30,
      lastSentDate: "2026-09-23",
    });
  });

  it("한 명에게라도 보냈으면 되돌리지 않는다 (두 번 보내지 않게)", async () => {
    mocks.sendAlimtalk
      .mockResolvedValueOnce({ messageId: "m1" })
      .mockRejectedValueOnce(new Error("알리고 오류"));
    await runLetterNoticeJob(MORNING);
    expect(mocks.revertLetterNotice).not.toHaveBeenCalled();
  });

  it("받을 사람이 없으면 보내지 않고 '여기까지 봤음'만 적는다", async () => {
    mocks.listLetterNoticeRecipients.mockResolvedValue([]);
    await runLetterNoticeJob(MORNING);
    expect(mocks.skipLetterNotice).toHaveBeenCalledWith(5, 33);
    expect(mocks.claimLetterNotice).not.toHaveBeenCalled();
    expect(mocks.sendAlimtalk).not.toHaveBeenCalled();
  });
});
