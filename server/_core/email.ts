import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "./env";

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
    enabled: Boolean(
      ENV.smtpHost && ENV.smtpUser && ENV.smtpPassword && ENV.smtpFrom
    ),
  };
}

function getTransporter() {
  if (!getEmailConfigStatus().enabled) {
    throw new Error("메일 발송 설정(SMTP)이 되어 있지 않습니다.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      // 465 는 처음부터 암호화된 연결, 그 외(587 등)는 STARTTLS 로 올린다.
      secure: ENV.smtpPort === 465,
      auth: { user: ENV.smtpUser, pass: ENV.smtpPassword },
    });
  }

  return transporter;
}

export async function sendEmail(input: SendEmailInput) {
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
