import {
  listDueReminderSubscriptions,
  markReminderNotificationFailed,
  markReminderNotificationSent,
} from "../db";
import { ENV } from "./env";
import { getSmsConfigStatus, sendSms } from "./sms";

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

function buildMemorialUrl(slug: string) {
  const baseUrl = ENV.publicSiteUrl || "http://115.68.224.123:3050";
  return `${baseUrl.replace(/\/$/, "")}/memorial/${slug}`;
}

function buildReminderText(target: ReminderTarget) {
  const dayLabel = target.memorialDay || "추도일";
  return [
    "[소망이 있는 곳]",
    `내일은 ${target.memorialName} ${target.memorialRole}님의 ${dayLabel}입니다.`,
    "고인의 삶과 믿음을 기억하며 조용히 마음을 전해보세요.",
    buildMemorialUrl(target.memorialSlug),
  ].join("\n");
}

function extractMessageId(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const maybeResult = result as {
    groupId?: string;
    resultList?: Array<{ messageId?: string }>;
  };
  return maybeResult.resultList?.[0]?.messageId ?? maybeResult.groupId ?? null;
}

export async function runReminderNotificationJob(date = new Date()) {
  const status = getSmsConfigStatus();
  if (!status.enabled) {
    console.warn("[Reminder] SOLAPI is not fully configured.", status);
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
      const result = await sendSms({
        to: target.phone,
        text: buildReminderText(target),
      });
      await markReminderNotificationSent(
        target.id,
        target.notificationYear,
        extractMessageId(result)
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      await markReminderNotificationFailed(
        target.id,
        error instanceof Error ? error.message : "문자 발송 실패"
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
