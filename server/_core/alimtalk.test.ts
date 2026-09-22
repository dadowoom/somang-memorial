import { beforeAll, describe, expect, it } from "vitest";

// 가짜 설정값. 실제 키·번호가 아니다.
beforeAll(() => {
  Object.assign(process.env, {
    ALIGO_API_KEY: "test-key",
    ALIGO_USER_ID: "test-user",
    ALIGO_SENDER_KEY: "test-sender-key",
    ALIGO_SENDER: "010-0000-0000",
    ALIGO_TPL_REMINDER_CONFIRM: "UL_7251",
    ALIGO_TPL_REMINDER_DAY_BEFORE: "UL_7253",
    ALIGO_TPL_VERIFY_CODE: "UL_7254",
  });
});

const load = () => import("./alimtalk");

describe("추도일 알림톡 문구", () => {
  // 카카오 검수를 통과한 문구와 글자·줄바꿈까지 같아야 발송된다.
  // 이 시험이 깨지면 알리고에서 템플릿을 새로 검수받기 전에는 고치지 말 것.
  it("신청 완료 문구가 검수받은 템플릿과 같다", async () => {
    const { buildReminderConfirmMessage } = await load();
    const m = buildReminderConfirmMessage({
      deceased: "가상인 권사",
      memorialDay: "매년 05월 22일",
      memorialSlug: "gasang-kwonsa",
    });
    expect(m.message).toBe(
      "[소망이 있는 곳]\n" +
        "가상인 권사님 추도일 알림 신청이 완료되었습니다.\n" +
        "\n" +
        "추도일: 매년 05월 22일\n" +
        "추도일 하루 전 카카오톡으로 알려 드립니다.\n" +
        "\n" +
        "소망교회 온라인 추모관에서 추도일 알림을 신청하신 분께 보내는 안내입니다."
    );
    expect(m.buttons.map(b => [b.name, b.linkMo, b.linkPc])).toEqual([
      [
        "추모관 보기",
        "https://somangmemorial.co.kr/memorial/gasang-kwonsa",
        "https://somangmemorial.co.kr/memorial/gasang-kwonsa",
      ],
      [
        "알림 그만 받기",
        "https://somangmemorial.co.kr/memorial/gasang-kwonsa?reminder=stop",
        "https://somangmemorial.co.kr/memorial/gasang-kwonsa?reminder=stop",
      ],
    ]);
  });

  it("하루 전 알림 문구가 검수받은 템플릿과 같다", async () => {
    const { buildReminderDayBeforeMessage } = await load();
    const m = buildReminderDayBeforeMessage({
      deceased: "가상인 권사",
      memorialDay: "매년 05월 22일",
      memorialSlug: "가상인",
    });
    expect(m.message).toBe(
      "[소망이 있는 곳]\n" +
        "내일은 가상인 권사님의 추도일입니다.\n" +
        "\n" +
        "추도일: 매년 05월 22일\n" +
        "고인의 삶과 믿음을 기억하며 조용히 마음을 전해 보세요.\n" +
        "\n" +
        "소망교회 온라인 추모관에서 추도일 알림을 신청하신 분께 보내는 안내입니다."
    );
    // 한글 주소도 링크가 깨지지 않게 바꿔 넣는다.
    expect(m.buttons[0].linkMo).toBe(
      "https://somangmemorial.co.kr/memorial/%EA%B0%80%EC%83%81%EC%9D%B8"
    );
  });

  it("인증번호 문구는 버튼 없이, 숫자 6자리만 받는다", async () => {
    const { buildVerifyCodeMessage } = await load();
    const m = buildVerifyCodeMessage("123456");
    expect(m.message).toBe(
      "[소망이 있는 곳]\n" +
        "인증번호는 123456입니다.\n" +
        "\n" +
        "추도일 알림 신청이나 해지를 위해 요청하신 번호입니다. 요청하지 않으셨다면 이 메시지는 무시해 주세요."
    );
    expect(m.buttons).toEqual([]);
    expect(() => buildVerifyCodeMessage("12345")).toThrow();
  });

  it("직분이 없으면 성함만 쓴다", async () => {
    const { formatDeceasedLabel } = await load();
    expect(formatDeceasedLabel(" 가상인 ", "권사")).toBe("가상인 권사");
    expect(formatDeceasedLabel("가상인", null)).toBe("가상인");
  });
});

describe("알리고 요청", () => {
  it("템플릿 코드·대체문자 끔·버튼을 담고, 번호는 숫자만 보낸다", async () => {
    const { buildAligoSendForm, buildReminderConfirmMessage } = await load();
    const form = buildAligoSendForm(
      "010-1234-5678",
      buildReminderConfirmMessage({
        deceased: "가상인",
        memorialDay: "추후 안내",
        memorialSlug: "gasang",
      })
    );
    expect(form.get("tpl_code")).toBe("UL_7251");
    expect(form.get("receiver_1")).toBe("01012345678");
    expect(form.get("sender")).toBe("01000000000");
    expect(form.get("failover")).toBe("N");
    expect(form.get("testMode")).toBeNull();
    const buttons = JSON.parse(form.get("button_1") ?? "{}").button;
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toMatchObject({
      linkType: "WL",
      linkTypeName: "웹링크",
    });
  });

  it("인증번호 알림톡에는 버튼을 싣지 않는다", async () => {
    const { buildAligoSendForm, buildVerifyCodeMessage } = await load();
    const form = buildAligoSendForm(
      "01012345678",
      buildVerifyCodeMessage("000111")
    );
    expect(form.get("tpl_code")).toBe("UL_7254");
    expect(form.get("button_1")).toBeNull();
  });

  it("설정이 모두 있어야 켜진 것으로 본다", async () => {
    const { getAlimtalkConfigStatus } = await load();
    expect(getAlimtalkConfigStatus().enabled).toBe(true);
  });
});
