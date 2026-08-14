import { describe, expect, it } from "vitest";

import {
  parseDatabaseUrl,
  toShellAssignments,
  toShellSingleQuoted,
} from "./parseDatabaseUrl.mjs";

describe("parseDatabaseUrl", () => {
  it("분해한다", () => {
    expect(
      parseDatabaseUrl("mysql://somang:pw123@127.0.0.1:3306/somang_memorial")
    ).toEqual({
      host: "127.0.0.1",
      port: "3306",
      user: "somang",
      password: "pw123",
      database: "somang_memorial",
    });
  });

  it("포트가 없으면 3306 으로 본다", () => {
    expect(parseDatabaseUrl("mysql://u:p@db.example.com/somang").port).toBe(
      "3306"
    );
  });

  // 비밀번호에 @ 나 / 가 들어가면 단순 문자열 자르기로는 잘못 분해된다.
  it("URL 인코딩된 특수문자를 원래대로 되돌린다", () => {
    const parsed = parseDatabaseUrl(
      "mysql://u%40ser:p%40ss%3Aw%2Fo%23rd@db.example.com/somang"
    );
    expect(parsed.user).toBe("u@ser");
    expect(parsed.password).toBe("p@ss:w/o#rd");
    expect(parsed.host).toBe("db.example.com");
    expect(parsed.database).toBe("somang");
  });

  it("mysql2:// 도 받는다", () => {
    expect(parseDatabaseUrl("mysql2://u:p@h/db").database).toBe("db");
  });

  it.each([
    ["", "비어 있"],
    ["그냥문자열", "형식"],
    ["postgres://u:p@h/db", "mysql"],
    ["mysql://u:p@h/", "데이터베이스 이름"],
  ])("잘못된 값 %s 은 오류로 알린다", (value, expected) => {
    expect(() => parseDatabaseUrl(value)).toThrow(new RegExp(expected));
  });
});

describe("toShellSingleQuoted", () => {
  it("작은따옴표로 감싼다", () => {
    expect(toShellSingleQuoted("simple")).toBe("'simple'");
  });

  // 셸에 그대로 넘겼을 때 값이 변형되면 안 되는 문자들.
  it("셸이 해석하는 문자를 그대로 보존한다", () => {
    expect(toShellSingleQuoted('a b$c`d"e\\f*g;h')).toBe(
      `'a b$c\`d"e\\f*g;h'`
    );
  });

  it("값 안의 작은따옴표를 처리한다", () => {
    expect(toShellSingleQuoted("it's")).toBe(`'it'\\''s'`);
  });
});

describe("toShellAssignments", () => {
  it("셸 대입문 다섯 줄을 만든다", () => {
    const output = toShellAssignments(
      parseDatabaseUrl("mysql://u:p@h:3307/db")
    );
    expect(output.split("\n")).toEqual([
      "DB_HOST='h'",
      "DB_PORT='3307'",
      "DB_USER='u'",
      "DB_PASS='p'",
      "DB_NAME='db'",
    ]);
  });
});
