import {
  claimLetterNotice,
  listLetterNoticeCandidates,
  listLetterNoticeRecipients,
  revertLetterNotice,
  skipLetterNotice,
} from "../db";
import { getSeoulDateParts, isReminderSendHour } from "../reminderSchedule";
import { ENV } from "./env";
import {
  buildLetterNoticeMessage,
  formatDeceasedLabel,
  getAlimtalkConfigStatus,
  sendAlimtalk,
} from "./alimtalk";

/** 새 편지를 이만큼마다 살펴본다. */
export const LETTER_NOTICE_INTERVAL_MS = 15 * 60 * 1000;
let running = false;

export function seoulDateKey(date: Date) {
  const { year, month, day } = getSeoulDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 새 편지 알림톡 (2026-09-23).
 *
 * - 15분마다 살펴보고, 서울 9시~20시에만 보낸다 (추도일 알림과 같은 시간).
 * - 같은 추모관은 하루(서울 날짜) 한 번까지만. 그 뒤에 온 편지는 다음 날 아침
 *   "새 편지 N통"으로 한꺼번에 알린다. 누가 편지를 많이 써도 알림은 하루 한 통이다.
 * - 받는 사람: 추모관을 만든 가족과 초대받은 가족 (알림을 끈 사람 빼고).
 * - 보내기 전에 "여기까지 알렸음"을 먼저 적고, 한 통도 못 보냈으면 되돌린다.
 * - LETTER_NOTICE_ENABLED=true 이고 템플릿 코드가 있을 때만 보낸다.
 */
export async function runLetterNoticeJob(date = new Date()) {
  if (!ENV.letterNoticeEnabled || !ENV.aligoTplLetterNotice) {
    return { sent: 0, failed: 0, skipped: true };
  }
  if (!isReminderSendHour(date)) {
    return { sent: 0, failed: 0, skipped: true };
  }
  if (!getAlimtalkConfigStatus().enabled) {
    console.warn("[LetterNotice] AlimTalk is not fully configured.");
    return { sent: 0, failed: 0, skipped: true };
  }

  const today = seoulDateKey(date);
  const candidates = await listLetterNoticeCandidates(today);
  let sent = 0;
  let failed = 0;

  for (const target of candidates) {
    const recipients = await listLetterNoticeRecipients(target.memorialId);
    if (recipients.length === 0) {
      // 받을 사람이 없으면 보내지 않고 "여기까지 봤음"만 적는다.
      await skipLetterNotice(target.memorialId, target.maxLetterId);
      continue;
    }

    const claimed = await claimLetterNotice({
      memorialId: target.memorialId,
      expectLastLetterId: target.lastLetterId,
      expectSentDate: target.lastSentDate,
      lastLetterId: target.maxLetterId,
      today,
    });
    if (!claimed) continue;

    const message = buildLetterNoticeMessage({
      deceased: formatDeceasedLabel(target.memorialName, target.memorialRole),
      letterCount: target.newCount,
      memorialSlug: target.memorialSlug,
    });
    let delivered = 0;
    for (const recipient of recipients) {
      try {
        await sendAlimtalk(recipient.phone, message);
        delivered += 1;
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `[LetterNotice] 추모관 ${target.memorialId} 회원 ${recipient.userId} 발송 실패`,
          error instanceof Error ? error.message : error
        );
      }
    }
    if (delivered === 0) {
      try {
        await revertLetterNotice({
          memorialId: target.memorialId,
          lastLetterId: target.lastLetterId,
          lastSentDate: target.lastSentDate,
        });
      } catch (error) {
        console.error("[LetterNotice] 되돌리기 실패", error);
      }
    }
  }

  if (candidates.length > 0) {
    console.log(
      `[LetterNotice] finished. memorials=${candidates.length} sent=${sent} failed=${failed}`
    );
  }
  return { sent, failed, skipped: false };
}

export function startLetterNoticeScheduler() {
  if (!ENV.letterNoticeEnabled) return;

  const run = () => {
    if (running) return;
    running = true;
    runLetterNoticeJob()
      .catch(error => {
        console.error("[LetterNotice] scheduled job failed:", error);
      })
      .finally(() => {
        running = false;
      });
  };

  setTimeout(run, 20_000);
  setInterval(run, LETTER_NOTICE_INTERVAL_MS);
}
