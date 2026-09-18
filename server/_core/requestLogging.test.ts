import { describe, expect, it } from "vitest";
import { planErrorResponse, shouldLogTrpcError } from "./requestLogging";

describe("planErrorResponse", () => {
  it("없는 사진(express.static 404)은 404 로 답하고 경고로만 남긴다", () => {
    const error = Object.assign(new Error("Not Found"), { status: 404 });
    expect(planErrorResponse(error)).toEqual({
      status: 404,
      body: "Not Found",
      level: "warn",
    });
  });

  it("깨진 JSON(400)·너무 큰 본문(413)·경로 우회(403)도 원래 코드를 쓴다", () => {
    expect(
      planErrorResponse(Object.assign(new Error("x"), { status: 400 })).status
    ).toBe(400);
    expect(
      planErrorResponse(Object.assign(new Error("x"), { statusCode: 413 }))
        .status
    ).toBe(413);
    expect(
      planErrorResponse(Object.assign(new Error("x"), { status: 403 })).body
    ).toBe("Forbidden");
  });

  it("분류되지 않은 오류는 그대로 500 이고 오류 로그다", () => {
    expect(planErrorResponse(new Error("boom"))).toEqual({
      status: 500,
      body: "Internal Server Error",
      level: "error",
    });
    expect(planErrorResponse("string error").status).toBe(500);
    expect(planErrorResponse(null).status).toBe(500);
  });

  it("범위 밖이거나 숫자가 아닌 status 는 무시한다", () => {
    expect(
      planErrorResponse(Object.assign(new Error("x"), { status: 200 })).status
    ).toBe(500);
    expect(
      planErrorResponse(Object.assign(new Error("x"), { status: "404" })).status
    ).toBe(500);
    expect(
      planErrorResponse(Object.assign(new Error("x"), { status: 999 })).status
    ).toBe(500);
  });
});

describe("shouldLogTrpcError", () => {
  it("서버 쪽 잘못(INTERNAL_SERVER_ERROR 등)은 기록한다", () => {
    expect(shouldLogTrpcError("INTERNAL_SERVER_ERROR")).toBe(true);
    expect(shouldLogTrpcError("TIMEOUT")).toBe(true);
    expect(shouldLogTrpcError("UNKNOWN_CODE")).toBe(true);
  });

  it("호출자 쪽 오류(로그인 실패·없음·횟수 초과·검증)는 기록하지 않는다", () => {
    for (const code of [
      "UNAUTHORIZED",
      "NOT_FOUND",
      "TOO_MANY_REQUESTS",
      "BAD_REQUEST",
      "FORBIDDEN",
      "PRECONDITION_FAILED",
    ]) {
      expect(shouldLogTrpcError(code)).toBe(false);
    }
  });
});

describe("DB 오류 문구의 값 가리기", () => {
  it("drizzle 이 붙인 params 뒤의 개인정보를 가린다", async () => {
    const { redactQueryParams } = await import("./requestLogging");
    const message =
      "Failed query: insert into `users` (`email`, `phone`) values (?, ?)\nparams: kim@example.org,010-1234-5678";
    const redacted = redactQueryParams(message);
    expect(redacted).toContain("insert into `users`");
    expect(redacted).not.toContain("kim@example.org");
    expect(redacted).not.toContain("010-1234-5678");
  });

  it("params 가 없는 문구는 그대로 둔다", async () => {
    const { redactQueryParams } = await import("./requestLogging");
    expect(redactQueryParams("Duplicate entry")).toBe("Duplicate entry");
  });
});
