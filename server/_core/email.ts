import nodemailer, { type Transporter } from "nodemailer";
import { inquirySourceLabel } from "../../shared/kioskInquiry";
import { ENV } from "./env";
import { isFakeMode, maskForFakeLog, maskNumbersForFakeLog } from "./fakeMode";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

let transporter: Transporter | null = null;

export function getEmailConfigStatus() {
  return {
    hasHost: Boolean(ENV.smtpHost),
    hasUser: Boolean(ENV.smtpUser),
    hasPassword: Boolean(ENV.smtpPassword),
    hasFrom: Boolean(ENV.smtpFrom),
    // 작업장에서는 메일 설정이 없어도 켜진 것으로 보고, 보내기는 기록만 남긴다.
    enabled:
      isFakeMode() ||
      Boolean(ENV.smtpHost && ENV.smtpUser && ENV.smtpPassword && ENV.smtpFrom),
  };
}

function getTransporter() {
  if (!getEmailConfigStatus().enabled) {
    throw new Error("메일 발송 설정(SMTP)이 되어 있지 않습니다.");
  }

  if (!transporter) {
    const previewMail =
      isFakeMode() && ENV.smtpHost === "mail" && ENV.smtpPort === 1025;
    transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      // 465 는 처음부터 암호화된 연결, 그 외(587 등)는 STARTTLS 로 올린다.
      secure: !previewMail && ENV.smtpPort === 465,
      ...(previewMail
        ? { ignoreTLS: true, requireTLS: false }
        : { auth: { user: ENV.smtpUser, pass: ENV.smtpPassword } }),
      // 기본값은 연결 2분·응답 10분이라, 메일 서버가 느리면 문의·비밀번호
      // 재설정 요청이 몇 분씩 붙잡혀 있었다 (2026-09-18 점검).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  return transporter;
}

export async function sendEmail(input: SendEmailInput) {
  // The isolated preview sink is the only fake-mode transport that actually sends.
  const previewMail =
    isFakeMode() && ENV.smtpHost === "mail" && ENV.smtpPort === 1025;
  if (isFakeMode() && !previewMail) {
    console.log(
      `[가짜 메일] 보내지 않고 기록만: 받는 주소 ${maskForFakeLog(input.to, 8)} · ${maskNumbersForFakeLog(input.subject)}`
    );
    return;
  }
  const mailer = getTransporter();
  await mailer.sendMail({
    from: ENV.smtpFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}

/**
 * 비밀번호 재설정 안내 메일.
 *
 * 링크는 한 번만 쓸 수 있고 정해진 시간이 지나면 만료됩니다. 본문에 계정
 * 정보를 넣지 않습니다 — 메일함을 다른 사람이 보더라도 계정에 대해 알 수
 * 있는 것이 없어야 합니다.
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const lines = [
    "소망교회 온라인 추모관 「소망이 있는 곳」입니다.",
    "",
    "비밀번호를 다시 정하시려면 아래 주소를 눌러 주세요.",
    "",
    input.resetUrl,
    "",
    `이 주소는 ${input.expiresInMinutes}분 동안만 쓸 수 있고, 한 번 사용하면 다시 쓸 수 없습니다.`,
    "",
    "비밀번호를 바꾸려 하신 적이 없다면 이 메일을 지우셔도 됩니다.",
    "지금 비밀번호는 그대로 유지됩니다.",
  ];

  await sendEmail({
    to: input.to,
    subject: "[소망이 있는 곳] 비밀번호 재설정 안내",
    text: lines.join("\n"),
  });
}

/**
 * 키오스크 "문의"로 남긴 전화번호를 업체에 알리는 메일 (2026-09-16).
 * 업체가 이 메일을 보고 전화하는 것이 목적이라 번호를 가리지 않는다.
 */
export async function sendKioskInquiryEmail(input: {
  to: string;
  phone: string;
  name: string | null;
  inquiryId: number;
  /** 들어온 곳 (kiosk·web). 없으면 키오스크 (2026-09-17). */
  source?: string;
}) {
  const when = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const place = inquirySourceLabel(input.source);
  await sendEmail({
    to: input.to,
    subject: `[소망 추모관 ${place}] 제작 문의 접수 ${input.phone}`,
    text: [
      `${place}에서 추모관 제작 문의가 접수되었습니다.`,
      "",
      `전화번호: ${input.phone}`,
      `성함: ${input.name ?? "(입력 안 함)"}`,
      `접수 시각: ${when}`,
      `접수 번호: ${input.inquiryId}`,
      "",
      "이 번호로 전화해 주세요. 처리한 뒤에는 관리자 화면 → 운영 → 문의에서 '전화함'으로 표시할 수 있습니다.",
    ].join("\n"),
  });
}
