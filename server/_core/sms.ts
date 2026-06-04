import { SolapiMessageService } from "solapi";
import { ENV } from "./env";

type SendSmsInput = {
  to: string;
  text: string;
};

let messageService: SolapiMessageService | null = null;

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function getSmsConfigStatus() {
  return {
    hasApiKey: Boolean(ENV.solapiApiKey),
    hasApiSecret: Boolean(ENV.solapiApiSecret),
    hasFromNumber: Boolean(digitsOnly(ENV.solapiFromNumber)),
    enabled: Boolean(
      ENV.solapiApiKey &&
        ENV.solapiApiSecret &&
        digitsOnly(ENV.solapiFromNumber)
    ),
  };
}

function getMessageService() {
  if (!ENV.solapiApiKey || !ENV.solapiApiSecret) {
    throw new Error("SOLAPI API Key 또는 Secret이 설정되지 않았습니다.");
  }

  if (!messageService) {
    messageService = new SolapiMessageService(
      ENV.solapiApiKey,
      ENV.solapiApiSecret
    );
  }

  return messageService;
}

export async function sendSms(input: SendSmsInput) {
  const from = digitsOnly(ENV.solapiFromNumber);
  const to = digitsOnly(input.to);

  if (!from) {
    throw new Error("SOLAPI 발신번호가 설정되지 않았습니다.");
  }

  if (!to || to.length < 10) {
    throw new Error("수신번호 형식이 올바르지 않습니다.");
  }

  const service = getMessageService();
  return service.send({
    to,
    from,
    text: input.text,
  });
}
