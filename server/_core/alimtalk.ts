import { ENV } from "./env";

/**
 * 추도일 알림을 카카오 알림톡으로 보낸다 (2026-09-23, 문자 대신).
 *
 * 보내는 채널은 제작 업체의 "인생화원" 채널이고, 발송 업체는 알리고다.
 * 카카오 검수를 통과한 문구(템플릿)만 보낼 수 있고, 보낼 때의 본문은 검수받은
 * 문구와 **글자·줄바꿈까지 같아야** 한다. 바뀌는 것은 #{변수} 자리뿐이다.
 * 그래서 아래 문구를 고치려면 알리고에서 템플릿을 새로 검수받아야 한다.
 * 절차와 원래 문구: docs/REMINDER_ALIMTALK.md
 */

const ALIGO_SEND_URL = "https://kakaoapi.aligo.in/akv10/alimtalk/send/";
const SEND_TIMEOUT_MS = 10_000;

/**
 * 버튼 주소는 템플릿에 등록한 주소와 앞부분이 같아야 한다. 등록할 때
 * https://somangmemorial.co.kr/memorial/#{추모관주소} 로 올렸으므로,
 * PUBLIC_SITE_URL 값과 상관없이 이 도메인을 쓴다.
 */
const TEMPLATE_SITE_URL = "https://somangmemorial.co.kr";

type AlimtalkButton = {
  name: string;
  linkType: "WL";
  linkTypeName: "웹링크";
  linkMo: string;
  linkPc: string;
};

export type AlimtalkMessage = {
  templateCode: string;
  /** 알리고가 요구하는 제목. 받는 분 화면에는 나오지 않는다. */
  subject: string;
  message: string;
  buttons: AlimtalkButton[];
};

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function getAlimtalkConfigStatus() {
  const hasApiKey = Boolean(ENV.aligoApiKey && ENV.aligoUserId);
  const hasSenderKey = Boolean(ENV.aligoSenderKey);
  const hasFromNumber = Boolean(digitsOnly(ENV.aligoSender));
  const hasTemplates = Boolean(
    ENV.aligoTplReminderConfirm &&
      ENV.aligoTplReminderDayBefore &&
      ENV.aligoTplVerifyCode
  );
  return {
    hasApiKey,
    hasSenderKey,
    hasFromNumber,
    hasTemplates,
    enabled: hasApiKey && hasSenderKey && hasFromNumber && hasTemplates,
  };
}

/** 성함과 직분을 "김소망 권사" 처럼 붙인다. 직분이 없으면 성함만. */
export function formatDeceasedLabel(name: string, role?: string | null) {
  return [name.trim(), (role ?? "").trim()].filter(Boolean).join(" ");
}

function memorialButtons(slug: string): AlimtalkButton[] {
  const memorialUrl = `${TEMPLATE_SITE_URL}/memorial/${encodeURIComponent(slug)}`;
  const stopUrl = `${memorialUrl}?reminder=stop`;
  return [
    {
      name: "추모관 보기",
      linkType: "WL",
      linkTypeName: "웹링크",
      linkMo: memorialUrl,
      linkPc: memorialUrl,
    },
    {
      name: "알림 그만 받기",
      linkType: "WL",
      linkTypeName: "웹링크",
      linkMo: stopUrl,
      linkPc: stopUrl,
    },
  ];
}

type ReminderMessageInput = {
  deceased: string;
  memorialDay: string;
  memorialSlug: string;
};

/** 템플릿 "추도일 알림 신청 완료" (알리고 UL_7251). */
export function buildReminderConfirmMessage(
  input: ReminderMessageInput
): AlimtalkMessage {
  return {
    templateCode: ENV.aligoTplReminderConfirm,
    subject: "추도일 알림 신청 완료",
    message: [
      "[소망이 있는 곳]",
      `${input.deceased}님 추도일 알림 신청이 완료되었습니다.`,
      "",
      `추도일: ${input.memorialDay}`,
      "추도일 하루 전 카카오톡으로 알려 드립니다.",
      "",
      "소망교회 온라인 추모관에서 추도일 알림을 신청하신 분께 보내는 안내입니다.",
    ].join("\n"),
    buttons: memorialButtons(input.memorialSlug),
  };
}

/** 템플릿 "추도일 하루 전 알림" (알리고 UL_7253). */
export function buildReminderDayBeforeMessage(
  input: ReminderMessageInput
): AlimtalkMessage {
  return {
    templateCode: ENV.aligoTplReminderDayBefore,
    subject: "추도일 하루 전 알림",
    message: [
      "[소망이 있는 곳]",
      `내일은 ${input.deceased}님의 추도일입니다.`,
      "",
      `추도일: ${input.memorialDay}`,
      "고인의 삶과 믿음을 기억하며 조용히 마음을 전해 보세요.",
      "",
      "소망교회 온라인 추모관에서 추도일 알림을 신청하신 분께 보내는 안내입니다.",
    ].join("\n"),
    buttons: memorialButtons(input.memorialSlug),
  };
}

/**
 * 템플릿 "새 편지 도착 알림" (2026-09-23). 추모관을 만든 가족·초대받은 가족에게
 * 보낸다. 버튼은 가족용 편지 화면과 알림 설정 화면이다 (로그인 필요).
 */
export function buildLetterNoticeMessage(input: {
  deceased: string;
  letterCount: number;
  memorialSlug: string;
}): AlimtalkMessage {
  const lettersUrl = `${TEMPLATE_SITE_URL}/my/memorials/${encodeURIComponent(
    input.memorialSlug
  )}/letters`;
  const settingsUrl = `${TEMPLATE_SITE_URL}/my/account`;
  return {
    templateCode: ENV.aligoTplLetterNotice,
    subject: "새 편지 도착 알림",
    message: [
      "[소망이 있는 곳]",
      `${input.deceased}님 추모관에 새 편지 ${input.letterCount}통이 도착했습니다.`,
      "",
      "가족분께서 편지를 읽어 보시고, 추모관에 어울리지 않는 편지는 숨기실 수 있습니다.",
      "",
      "소망교회 온라인 추모관을 만드신 가족께 보내는 안내입니다.",
    ].join("\n"),
    buttons: [
      {
        name: "편지 확인하기",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: lettersUrl,
        linkPc: lettersUrl,
      },
      {
        name: "알림 설정",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: settingsUrl,
        linkPc: settingsUrl,
      },
    ],
  };
}

/** 템플릿 "알림 인증번호" (알리고 UL_7254, 보안 템플릿, 버튼 없음). */
export function buildVerifyCodeMessage(code: string): AlimtalkMessage {
  if (!/^\d{6}$/.test(code))
    throw new Error("인증번호는 숫자 6자리여야 합니다.");
  return {
    templateCode: ENV.aligoTplVerifyCode,
    subject: "알림 인증번호",
    message: [
      "[소망이 있는 곳]",
      `인증번호는 ${code}입니다.`,
      "",
      "추도일 알림 신청이나 해지를 위해 요청하신 번호입니다. 요청하지 않으셨다면 이 메시지는 무시해 주세요.",
    ].join("\n"),
    buttons: [],
  };
}

/** 알리고에 보낼 요청 본문. 비밀값이 들어가므로 로그에 남기지 않는다. */
export function buildAligoSendForm(to: string, message: AlimtalkMessage) {
  const form = new URLSearchParams({
    apikey: ENV.aligoApiKey,
    userid: ENV.aligoUserId,
    senderkey: ENV.aligoSenderKey,
    tpl_code: message.templateCode,
    sender: digitsOnly(ENV.aligoSender),
    receiver_1: digitsOnly(to),
    subject_1: message.subject,
    message_1: message.message,
    // 카카오톡이 안 되는 분께 문자로 대신 보내지 않는다. 문자 요금이 따로
    // 나가고 발신번호가 보이기 때문이다 (2026-09-23 결정).
    failover: "N",
  });
  if (message.buttons.length > 0) {
    form.set("button_1", JSON.stringify({ button: message.buttons }));
  }
  if (ENV.aligoTestMode) form.set("testMode", "Y");
  return form;
}

/**
 * 알림톡 한 통을 보낸다. 성공하면 알리고 메시지 번호를 돌려주고,
 * 실패하면 오류를 던진다. 실패 사유는 서버 로그에만 남기고, 화면에는
 * 쉬운 말로 바꿔 보여 준다 (부르는 쪽 책임).
 */
export async function sendAlimtalk(to: string, message: AlimtalkMessage) {
  const status = getAlimtalkConfigStatus();
  if (!status.enabled) {
    throw new Error("알림톡 발송 설정이 끝나지 않았습니다.");
  }
  if (!message.templateCode) {
    throw new Error("알림톡 템플릿 코드가 설정되지 않았습니다.");
  }
  const receiver = digitsOnly(to);
  if (receiver.length < 10 || receiver.length > 11) {
    throw new Error("수신번호 형식이 올바르지 않습니다.");
  }

  const response = await fetch(ALIGO_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildAligoSendForm(receiver, message).toString(),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`알림톡 발송 요청 실패 (HTTP ${response.status})`);
  }
  const result = (await response.json().catch(() => null)) as {
    code?: number | string;
    message?: string;
    info?: { mid?: number | string };
  } | null;
  if (!result || Number(result.code) !== 0) {
    throw new Error(
      `알림톡 발송 실패 (code ${result?.code ?? "?"}: ${result?.message ?? "응답 없음"})`
    );
  }
  return {
    messageId: result.info?.mid != null ? String(result.info.mid) : null,
  };
}
