/**
 * 부고장의 "일정 저장" 버튼을 위한 도우미입니다.
 *
 * 추모관의 예배 일시(servicePlace/serviceTime)는 담당자가 자유롭게 적는 칸이라
 * "2026년 5월 22일 목요일 오전 10시" 처럼 형식이 정해져 있지 않습니다.
 * 그래서 읽어낼 수 있을 때만 달력 파일을 만들고, 못 읽으면 버튼 자체를 숨깁니다.
 * 잘못된 날짜를 달력에 넣는 것보다 버튼이 없는 편이 낫습니다.
 */

export type ServiceMoment = {
  year: number;
  month: number;
  day: number;
  /** 시각을 못 읽었으면 하루 종일 일정으로 만듭니다. */
  hour?: number;
  minute?: number;
};

const DATE_PATTERNS = [
  /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/,
  /(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/,
];

function isRealDate(year: number, month: number, day: number) {
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function readTime(text: string) {
  // "오전 10시", "오후 2시 30분", "10:00", "14시"
  const meridiem = /오전|오후/.exec(text)?.[0];
  const korean = /(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/.exec(text);
  const colon = /(\d{1,2})\s*:\s*(\d{2})/.exec(text);

  let hour: number;
  let minute: number;

  if (korean) {
    hour = Number(korean[1]);
    minute = korean[2] ? Number(korean[2]) : 0;
  } else if (colon) {
    hour = Number(colon[1]);
    minute = Number(colon[2]);
  } else {
    return undefined;
  }

  if (meridiem === "오후" && hour < 12) hour += 12;
  if (meridiem === "오전" && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  return { hour, minute };
}

/** 자유 형식 문구에서 날짜(있으면 시각까지)를 읽어냅니다. 못 읽으면 null. */
export function parseServiceMoment(text?: string | null): ServiceMoment | null {
  const source = (text ?? "").trim();
  if (!source) return null;

  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(source);
    if (!match) continue;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isRealDate(year, month, day)) continue;

    // 날짜에 쓰인 부분을 뺀 나머지에서만 시각을 찾습니다.
    // "2026년 5월 22일"의 5나 22를 시각으로 잘못 읽지 않게 합니다.
    const rest = source.slice(0, match.index) + source.slice(match.index + match[0].length);

    return { year, month, day, ...(readTime(rest) ?? {}) };
  }

  return null;
}

const pad = (value: number) => String(value).padStart(2, "0");

function stampDate({ year, month, day }: ServiceMoment) {
  return `${year}${pad(month)}${pad(day)}`;
}

function addOneDay({ year, month, day }: ServiceMoment) {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

/** 캘린더 앱이 읽을 수 없는 글자를 규격대로 피합니다. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * 달력 파일 규격은 한 줄을 75바이트로 제한합니다. 한글은 글자당 3바이트라
 * 장소나 설명이 조금만 길어도 넘습니다. 넘는 줄은 규격대로 접습니다.
 */
function foldLine(line: string) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const pieces: string[] = [];
  let current = "";
  let currentBytes = 0;
  // 이어지는 줄은 앞에 공백 한 칸이 붙으므로 그만큼 여유를 둔다.
  let limit = 75;

  for (const character of line) {
    const size = encoder.encode(character).length;
    if (currentBytes + size > limit) {
      pieces.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += character;
    currentBytes += size;
  }
  if (current) pieces.push(current);

  return pieces.join("\r\n ");
}

export function buildCalendarFile(options: {
  moment: ServiceMoment;
  title: string;
  location?: string | null;
  description?: string | null;
  /** 같은 일정을 두 번 저장해도 달력에 하나만 남게 하는 식별자입니다. */
  uid?: string;
}) {
  const { moment, title, location, description, uid } = options;
  const hasTime = moment.hour !== undefined;

  // 예배는 그 지역 시간으로 열립니다. UTC로 바꾸면 시차만큼 어긋나므로
  // 시간대 없는 지역 시각(floating time)으로 적습니다.
  const start = hasTime
    ? `DTSTART:${stampDate(moment)}T${pad(moment.hour ?? 0)}${pad(moment.minute ?? 0)}00`
    : `DTSTART;VALUE=DATE:${stampDate(moment)}`;
  const endHour = (moment.hour ?? 0) + 1;
  const end = hasTime
    ? endHour > 23
      ? `DTEND:${stampDate(moment)}T235900`
      : `DTEND:${stampDate(moment)}T${pad(endHour)}${pad(moment.minute ?? 0)}00`
    : `DTEND;VALUE=DATE:${addOneDay(moment)}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//somang-memorial//obituary//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${stampDate(moment)}-${uid ?? encodeURIComponent(title)}@somang-memorial`,
    start,
    end,
    `SUMMARY:${escapeText(title)}`,
  ];

  if (location?.trim()) lines.push(`LOCATION:${escapeText(location.trim())}`);
  if (description?.trim())
    lines.push(`DESCRIPTION:${escapeText(description.trim())}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n");
}
