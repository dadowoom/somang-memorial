import {
  listDueReminderSubscriptions,
  markReminderNotificationFailed,
  markReminderNotificationSent,
} from "../db";
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
let lastRunKey = "";

function getSeoulDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return { year, month, day };
}

function buildReminderMessage(target: ReminderTarget) {
  return buildReminderDayBeforeMessage({
    deceased: formatDeceasedLabel(target.memorialName, target.memorialRole),
    memorialDay: target.memorialDay || "추도일",
    memorialSlug: target.memorialSlug,
  });
}

export async function runReminderNotificationJob(date = new Date()) {
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
        error instanceof Error ? error.message : "알림톡 발송 실패"
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

  const runOncePerSeoulDay = () => {
    const { year, month, day } = getSeoulDateParts();
    const runKey = `${year}-${month}-${day}`;
    if (lastRunKey === runKey) return;
    lastRunKey = runKey;
    runReminderNotificationJob().catch(error => {
      console.error("[Reminder] scheduled job failed:", error);
    });
  };

  setTimeout(runOncePerSeoulDay, 10_000);
  setInterval(runOncePerSeoulDay, HOUR_MS);
}
