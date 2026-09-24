import {
  claimLetterNotice,
  createAdminAuditLog,
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
/**
 * 같은 새 편지 알림을 이만큼 보내 보고도 한 통도 못 보냈으면 멈춘다 (2026-09-24).
 * 전에는 카카오톡이 없는 번호 등으로 계속 실패해도 15분마다 끝없이 다시 보냈다.
 */
export const LETTER_NOTICE_MAX_TRIES = 3;
let running = false;
// 추모관별로 이번 새 편지 알림(지난번에 알린 편지 번호 afterLetterId 뒤의 편지들)을
// 한 통도 못 보낸 횟수. 새 편지가 와서 알릴 묶음이 바뀌면 처음부터 센다.
// 서버를 다시 켜면 비워진다.
const failedTries = new Map<number, { afterLetterId: number; count: number }>();

export function resetLetterNoticeTries() {
  failedTries.clear();
}

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
 *   3번 모두 못 보냈으면(카카오톡이 없는 번호 등) 그 편지들 알림은 멈추고
 *   관리 기록(letter_notice.give_up)에 남긴다. 새 편지가 오면 다시 시도한다.
 * - 한 추모관에서 오류가 나도 나머지 추모관은 계속 보낸다.
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
    try {
      const recipients = await listLetterNoticeRecipients(target.memorialId);
      if (recipients.length === 0) {
        // 받을 사람이 없으면 보내지 않고 "여기까지 봤음"만 적는다.
        await skipLetterNotice(target.memorialId, target.maxLetterId);
        continue;
      }

      // 적은 뒤에 오류가 나서 못 보내는 일이 없게, 글은 적기 전에 만든다.
      const message = buildLetterNoticeMessage({
        deceased: formatDeceasedLabel(target.memorialName, target.memorialRole),
        letterCount: target.newCount,
        memorialSlug: target.memorialSlug,
      });
      const claimed = await claimLetterNotice({
        memorialId: target.memorialId,
        expectLastLetterId: target.lastLetterId,
        expectSentDate: target.lastSentDate,
        lastLetterId: target.maxLetterId,
        today,
      });
      if (!claimed) continue;

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
      if (delivered > 0) {
        failedTries.delete(target.memorialId);
        continue;
      }

      const previous = failedTries.get(target.memorialId);
      const count =
        (previous?.afterLetterId === target.lastLetterId ? previous.count : 0) +
        1;
      failedTries.set(target.memorialId, {
        afterLetterId: target.lastLetterId,
        count,
      });
      if (count >= LETTER_NOTICE_MAX_TRIES) {
        // 3번 모두 한 통도 못 보냈으면(카카오톡이 없는 번호 등) 이 편지들 알림은
        // 멈춘다. 먼저 적어 둔 "여기까지 알렸음·오늘 보냈음"을 그대로 두므로 다시
        // 보내지 않는다. 새 편지가 오면 그때 다시 시도한다. 멈춘 것은 관리 기록에 남긴다.
        failedTries.delete(target.memorialId);
        console.warn(
          `[LetterNotice] 추모관 ${target.memorialId} ${count}번 모두 못 보내 멈춤. 받는 가족의 번호와 카카오톡을 확인해 주세요.`
        );
        try {
          await createAdminAuditLog({
            adminUserId: null,
            targetUserId: null,
            action: "letter_notice.give_up",
            beforeValue: `새 편지 ${target.newCount}통`,
            afterValue: `${count}번 실패로 멈춤`,
            note: `${target.memorialName} (${target.memorialSlug}) · 받는 가족 ${recipients.length}명 모두 발송 실패`.slice(
              0,
              500
            ),
          });
        } catch (error) {
          console.error("[LetterNotice] 멈춤 기록 실패", error);
        }
        continue;
      }
      try {
        // 편지 번호를 되돌려 다음 차례(15분 뒤)에 다시 보낸다.
        await revertLetterNotice({
          memorialId: target.memorialId,
          lastLetterId: target.lastLetterId,
          lastSentDate: target.lastSentDate,
        });
      } catch (error) {
        console.error("[LetterNotice] 되돌리기 실패", error);
      }
    } catch (error) {
      // 한 추모관에서 오류가 나도 나머지 추모관은 계속 보낸다.
      console.error(
        `[LetterNotice] 추모관 ${target.memorialId} 처리 실패`,
        error instanceof Error ? error.message : error
      );
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
