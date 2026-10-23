import { afterEach, describe, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue({}),
  createTransport: vi.fn(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: mail.createTransport },
}));

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  mail.sendMail.mockClear();
  mail.createTransport.mockClear();
  vi.resetModules();
});

describe("preview mail boundary", () => {
  it("sends fake-mode mail only to the isolated mail sink without authentication", async () => {
    process.env.SOMANG_FAKE = "1";
    process.env.SMTP_HOST = "mail";
    process.env.SMTP_PORT = "1025";
    process.env.SMTP_FROM = "preview@preview.invalid";
    mail.createTransport.mockReturnValue({ sendMail: mail.sendMail });
    const { sendEmail } = await import("./email");
    await sendEmail({
      to: "family@example.invalid",
      subject: "preview",
      text: "sample",
    });
    expect(mail.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "mail",
        port: 1025,
        secure: false,
        ignoreTLS: true,
        requireTLS: false,
      })
    );
    expect(mail.createTransport.mock.calls[0][0]).not.toHaveProperty("auth");
    expect(mail.sendMail).toHaveBeenCalledOnce();
  });
  it("keeps the existing fake-mode record-only behavior outside the preview sink", async () => {
    process.env.SOMANG_FAKE = "1";
    delete process.env.SMTP_HOST;
    mail.createTransport.mockReturnValue({ sendMail: mail.sendMail });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { sendEmail } = await import("./email");
      await sendEmail({
        to: "family@example.invalid",
        subject: "preview",
        text: "sample",
      });
      expect(mail.sendMail).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
