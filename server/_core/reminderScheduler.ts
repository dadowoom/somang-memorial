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
let running = false;

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
 * 표시를 되돌려 다음 시간에 다시 보낸다. 규칙: server/reminderSchedule.ts
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
    const claimed = await claimReminderNotification(
      target.id,
      target.notificationYear
    );
    if (!claimed) continue;

    try {
      const result = await sendAlimtalk(
        target.phone,
        buildReminderMessage(target)
      );
      await markReminderNotificationSent(
        target.id,
        target.notificationYear,
        result.messageId
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      await markReminderNotificationFailed(
        target.id,
        target.lastNotifiedYear ?? null,
        error instanceof Error ? error.message : "알림톡 발송 실패"
      ).catch(markError => {
        console.error("[Reminder] 실패 기록을 남기지 못함", markError);
      });
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
