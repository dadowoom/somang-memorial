import {
  claimReminderNotification,
  listDueReminderSubscriptions,
  markReminderNotificationFailed,
  markReminderNotificationSent,
} from "../db";
import { isReminderSendHour } from "../reminderSchedule";
import { ENV } from "./env";
import {
  buildReminderDayBeforeMessage,
  formatDeceasedLabel,
  getAlimtalkConfigStatus,
  sendAlimtalk,
} from "./alimtalk";

type ReminderTarget = Awaited<
  ReturnType<typeof listDueReminderSubscriptions>
>[number];

const HOUR_MS = 60 * 60 * 1000;
/**
 * 같은 해 추도일 알림을 이만큼 보내 보고도 못 보냈으면 올해는 멈춘다 (2026-09-24).
 * 전에는 카카오톡이 없는 번호 등으로 계속 실패해도 저녁 8시까지 매시간 다시 보냈다.
 */
export const REMINDER_MAX_TRIES = 3;
let running = false;
// 신청별로 올해 알림을 못 보낸 횟수. 서버를 다시 켜면 비워진다.
const failedTries = new Map<number, { year: number; count: number }>();

export function resetReminderTries() {
  failedTries.clear();
}

function buildReminderMessage(target: ReminderTarget) {
  return buildReminderDayBeforeMessage({
    deceased: formatDeceasedLabel(target.memorialName, target.memorialRole),
    memorialDay: target.memorialDay || "추도일",
    memorialSlug: target.memorialSlug,
  });
}

/**
 * 추도일 하루 전 알림을 보낸다 (2026-09-23 정리).
 *
 * 매시간 불린다. 서울 9시~20시에만 보내고, 한 분씩 "올해 보냄"을 먼저 찍은
 * 뒤에 보낸다. 먼저 찍지 못하면(이미 누가 보냈으면) 건너뛴다. 보내다 실패하면
 * 표시를 되돌려 다음 시간에 다시 보낸다. 3번 모두 실패하면 올해는 멈추고 까닭을
 * 남긴다 (2026-09-24). 한 분에게서 오류가 나도 나머지 분들께는 계속 보낸다.
 * 규칙: server/reminderSchedule.ts
 */
export async function runReminderNotificationJob(date = new Date()) {
  if (!isReminderSendHour(date)) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const status = getAlimtalkConfigStatus();
  if (!status.enabled) {
    console.warn("[Reminder] AlimTalk is not fully configured.", status);
    return { sent: 0, failed: 0, skipped: true };
  }

  const targets = await listDueReminderSubscriptions(
    date,
    ENV.reminderDaysBefore
  );
  let sent = 0;
  let failed = 0;

  for (const target of targets) {
    // 한 분에게서 오류가 나도 나머지 분들께는 계속 보낸다 (2026-09-24).
    try {
      // 표시를 찍은 뒤 글을 만들다 오류가 나서 못 보내는 일이 없게, 글은 먼저 만든다.
      const message = buildReminderMessage(target);
      const claimed = await claimReminderNotification(
        target.id,
        target.notificationYear
      );
      if (!claimed) continue;

      try {
        const result = await sendAlimtalk(target.phone, message);
        await markReminderNotificationSent(
          target.id,
          target.notificationYear,
          result.messageId
        );
        failedTries.delete(target.id);
        sent += 1;
      } catch (error) {
        failed += 1;
        const reason =
          error instanceof Error ? error.message : "알림톡 발송 실패";
        const previous = failedTries.get(target.id);
        const count =
          (previous?.year === target.notificationYear ? previous.count : 0) + 1;
        failedTries.set(target.id, { year: target.notificationYear, count });
        const giveUp = count >= REMINDER_MAX_TRIES;
        if (giveUp) {
          failedTries.delete(target.id);
          console.warn(
            `[Reminder] 신청 ${target.id} ${count}번 모두 못 보내 올해는 멈춤. 번호와 카카오톡을 확인해 주세요.`
          );
        }
        try {
          // 멈출 때는 "올해 보냄" 표시를 그대로 두어 더 보내지 않고, 까닭을
          // 신청 기록(lastNotificationError)에 남긴다. 아니면 되돌려 다음 시간에 다시 보낸다.
          await markReminderNotificationFailed(
            target.id,
            giveUp
              ? target.notificationYear
              : (target.lastNotifiedYear ?? null),
            giveUp
              ? `${count}번 실패로 올해 알림을 멈췄습니다: ${reason}`
              : reason
          );
        } catch (markError) {
          console.error("[Reminder] 실패 기록을 남기지 못함", markError);
        }
      }
    } catch (error) {
      console.error(
        `[Reminder] 신청 ${target.id} 처리 실패`,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (targets.length > 0) {
    console.log(
      `[Reminder] finished. targets=${targets.length} sent=${sent} failed=${failed}`
    );
  }

  return { sent, failed, skipped: false };
}

export function startReminderNotificationScheduler() {
  if (!ENV.reminderSchedulerEnabled) return;

  const runHourly = () => {
    // 한 번 도는 데 한 시간이 넘으면 겹치지 않게 이번 차례는 건너뛴다.
    if (running) return;
    running = true;
    runReminderNotificationJob()
      .catch(error => {
        console.error("[Reminder] scheduled job failed:", error);
      })
      .finally(() => {
        running = false;
      });
  };

  setTimeout(runHourly, 10_000);
  setInterval(runHourly, HOUR_MS);
}
