/**
 * 추도일 알림을 언제, 누구에게 보낼지 정하는 규칙 (2026-09-23 정리).
 *
 * - 추도일 하루 전(REMINDER_DAYS_BEFORE) 오전 9시부터 저녁 8시 사이에만 보낸다.
 *   밤이나 새벽에 알림이 울리지 않게 한다.
 * - 매시간 한 번 살펴보고, 아직 못 보낸 분께 보낸다. 앞 시간에 실패한 분은
 *   다음 시간에 다시 보낸다(저녁 8시까지).
 * - 음력 추도일은 양력 날짜로 바꿀 수 없어 보내지 않는다 (잘못된 날 알림 방지).
 */
export const REMINDER_SEND_START_HOUR = 9;
export const REMINDER_SEND_END_HOUR = 20;

export type SeoulDate = { year: number; month: number; day: number };

export function getSeoulDateParts(date = new Date()): SeoulDate {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);
  return { year, month, day };
}

export function getSeoulHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date)
  );
}

/** 서울 시각으로 보내도 되는 시간인가 (9시 ~ 20시 59분). */
export function isReminderSendHour(date = new Date()) {
  const hour = getSeoulHour(date);
  return hour >= REMINDER_SEND_START_HOUR && hour <= REMINDER_SEND_END_HOUR;
}

/** 오늘(서울)로부터 며칠 뒤 날짜. */
export function seoulDateAfter(date: Date, days: number): SeoulDate {
  return getSeoulDateParts(new Date(date.getTime() + days * 86_400_000));
}

/**
 * 추도일 글자에서 월·일을 읽는다. "매년 05월 22일", "5월 22일",
 * "2020-05-22", "5/22", "5.22" 를 읽는다. 음력이면 null.
 */
export function parseMemorialMonthDay(value: string | null | undefined) {
  if (!value) return null;
  if (value.includes("음력")) return null;

  const isoMatch = value.match(/\b\d{4}-(\d{1,2})-(\d{1,2})\b/);
  const koreanMatch = value.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  const slashMatch = value.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  const match = isoMatch ?? koreanMatch ?? slashMatch;
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/** 이 추도일에 대해 target 날짜에 알림을 보내야 하는가. */
export function isReminderDue(
  memorialDay: string | null | undefined,
  target: SeoulDate
) {
  const day = parseMemorialMonthDay(memorialDay);
  return day !== null && day.month === target.month && day.day === target.day;
}
