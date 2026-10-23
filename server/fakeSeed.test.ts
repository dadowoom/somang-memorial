import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkFakeSeedTarget,
  isFakeMode,
  maskNumbersForFakeLog,
} from "./_core/fakeMode";
import { decodeImageDataUrl } from "./_core/imageUpload";
import { readImageDimensions } from "./_core/imageDimensions";
import {
  FAKE_EMAIL_DOMAIN,
  FAKE_MEMORIALS,
  FAKE_USERS,
  checkSeedDatabase,
  type FakeSeedStore,
  fakeIntermentRows,
  makeFakePng,
  runFakeSeed,
  UnsafeFakeSeedDatabaseError,
} from "./fakeSeed";

const { createTransportMock, sendMailMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn().mockResolvedValue({});
  return {
    sendMailMock,
    createTransportMock: vi.fn(() => ({ sendMail: sendMailMock })),
  };
});
vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

// 작업장 가짜 자료 (2026-10-23).

describe("가짜 자료를 넣어도 되는 곳인지", () => {
  const base = {
    SOMANG_FAKE: "1",
    NODE_ENV: "development",
    DATABASE_URL: "mysql://u:p@127.0.0.1:3306/somang",
  };

  it("작업장 표식·이 컴퓨터·사설망·허용된 컨테이너 이름이면 넣는다", () => {
    for (const host of [
      "127.0.0.1",
      "localhost",
      "10.0.0.5",
      "192.168.0.9",
      "172.20.1.2",
      "db",
      "mysql",
      "somang-db",
    ]) {
      expect(
        checkFakeSeedTarget({
          ...base,
          DATABASE_URL: `mysql://u:p@${host}:3306/somang`,
        }),
        host
      ).toMatchObject({ ok: true });
    }
  });

  it("환경값에 정확히 적은 DB 이름을 대소문자 구분 없이 허용한다", () => {
    expect(
      checkFakeSeedTarget({
        ...base,
        DATABASE_URL: "mysql://u:p@Workshop-Custom:3306/somang",
        SOMANG_FAKE_DB_HOSTS: "other-db, WORKSHOP-CUSTOM",
      })
    ).toMatchObject({ ok: true });
  });

  it("표식이 없거나 운영 모드거나 바깥 주소면 멈춘다", () => {
    expect(
      checkFakeSeedTarget({ ...base, SOMANG_FAKE: undefined })
    ).toMatchObject({ ok: false });
    expect(checkFakeSeedTarget({ ...base, SOMANG_FAKE: "true" })).toMatchObject(
      { ok: false }
    );
    expect(
      checkFakeSeedTarget({ ...base, NODE_ENV: "production" })
    ).toMatchObject({ ok: false });
    for (const url of [
      "mysql://u:p@db.example-dbaas.net:3306/somang",
      "mysql://u:p@203.0.113.10:3306/somang",
      "mysql://u:p@172.32.0.1:3306/somang",
      "mysql://u:p@10.db.example.com:3306/somang",
      "mysql://u:p@127.0.0.1.evil.example:3306/somang",
      "mysql://u:p@192.168.1.1.example.com:3306/somang",
      "mysql://u:p@db.internal:3306/somang",
      "mysql://u:p@unknown-host:3306/somang",
      "mysql://u:p@127.1:3306/somang",
      "mysql://u:p@10.0.0.256:3306/somang",
      "not a url",
      "",
    ]) {
      expect(
        checkFakeSeedTarget({ ...base, DATABASE_URL: url }),
        url
      ).toMatchObject({ ok: false });
    }
  });
});

describe("DB 자료와 작업장 표식 확인", () => {
  it("빈 DB 또는 표식이 있는 DB만 허용한다", () => {
    expect(checkSeedDatabase({ isEmpty: true, hasMarker: false })).toEqual({
      ok: true,
    });
    expect(checkSeedDatabase({ isEmpty: false, hasMarker: true })).toEqual({
      ok: true,
    });
    expect(
      checkSeedDatabase({ isEmpty: false, hasMarker: false })
    ).toMatchObject({ ok: false });
  });
});

describe("가짜 사진", () => {
  it("서버가 받는 진짜 PNG 이고 크기도 맞다", () => {
    const png = makeFakePng(640, 480, [200, 180, 150]);
    expect(readImageDimensions(png, "png")).toEqual({
      width: 640,
      height: 480,
    });
    const decoded = decodeImageDataUrl(
      `data:image/png;base64,${png.toString("base64")}`
    );
    expect(decoded.ext).toBe("png");
    expect(png.length).toBeLessThan(200 * 1024);
  });
});

describe("가짜 자료에 실제 사람 정보가 없다", () => {
  it("이메일은 .invalid, 번호는 010-0000, 추모관 주소는 fake-, 글에는 [가짜]", () => {
    for (const user of FAKE_USERS) {
      expect(user.email.endsWith(`@${FAKE_EMAIL_DOMAIN}`)).toBe(true);
      expect(user.phone.startsWith("010-0000-")).toBe(true);
    }
    for (const memorial of FAKE_MEMORIALS) {
      expect(memorial.slug.startsWith("fake-")).toBe(true);
      expect(memorial.summary).toContain("[가짜]");
    }
    const rows = fakeIntermentRows();
    expect(rows).toHaveLength(30);
    expect(new Set(rows.map(row => row.sourceId)).size).toBe(30);
    expect(rows.every(row => row.sourceId <= -800000001)).toBe(true);
  });

  it("공개·비공개·작성 중·가족관·이북이 모두 들어 있다", () => {
    expect(FAKE_MEMORIALS.some(m => m.visibility === "private")).toBe(true);
    expect(FAKE_MEMORIALS.some(m => m.status === "pending")).toBe(true);
    expect(FAKE_MEMORIALS.some(m => m.familyRoom)).toBe(true);
    expect(FAKE_MEMORIALS.some(m => m.book)).toBe(true);
  });
});

/** 메모리 안 가짜 저장소. 실제 DB·파일에 닿지 않는다. */
function memoryStore() {
  const db = {
    admin: 0,
    users: new Map<string | null, number>(),
    interments: new Map<number, number>(),
    memorials: new Map<string, number>(),
    photos: new Map<number, number>(),
    letters: new Map<number, number>(),
    family: new Set<string>(),
    rooms: new Map<number, number>(),
    roomPhotos: new Map<number, number>(),
    books: new Map<number, number>(),
    pages: 0,
    posters: 0,
    marker: false,
    events: [] as string[],
    files: [] as string[],
  };
  let nextId = 1;
  const store: FakeSeedStore = {
    isDatabaseEmpty: async () =>
      db.admin === 0 &&
      db.users.size === 0 &&
      db.interments.size === 0 &&
      db.memorials.size === 0 &&
      db.letters.size === 0,
    hasWorkshopMarker: async () => db.marker,
    writeWorkshopMarker: async () => {
      db.events.push("marker");
      db.marker = true;
    },
    hasAdmin: async () => db.admin > 0,
    createAdmin: async () => {
      db.events.push("admin");
      db.admin += 1;
    },
    findUserIdByEmail: async email => db.users.get(email) ?? null,
    createUser: async input => {
      const id = nextId++;
      db.users.set(input.email, id);
      return id;
    },
    existingIntermentSourceIds: async ids =>
      new Set(ids.filter(id => db.interments.has(id))),
    insertInterments: async rows =>
      rows.forEach(row => db.interments.set(row.sourceId, nextId++)),
    findIntermentIdBySourceId: async sourceId =>
      db.interments.get(sourceId) ?? null,
    findMemorialIdBySlug: async slug => db.memorials.get(slug) ?? null,
    createMemorial: async input => {
      const id = nextId++;
      db.memorials.set(input.slug, id);
      return id;
    },
    countGalleryPhotos: async id => db.photos.get(id) ?? 0,
    addGalleryPhoto: async input => {
      db.files.push(input.image.key);
      db.photos.set(
        input.memorialId,
        (db.photos.get(input.memorialId) ?? 0) + 1
      );
    },
    countLetters: async id => db.letters.get(id) ?? 0,
    addLetter: async input => {
      const id = db.memorials.get(input.memorialSlug)!;
      db.letters.set(id, (db.letters.get(id) ?? 0) + 1);
    },
    addFamilyMember: async input => {
      const key = `${input.memorialId}:${input.userId}`;
      if (db.family.has(key)) return false;
      db.family.add(key);
      return true;
    },
    ensureFamilyRoom: async input => {
      const existing = db.rooms.get(input.memorialId);
      if (existing) return { roomId: existing, created: false };
      const id = nextId++;
      db.rooms.set(input.memorialId, id);
      return { roomId: id, created: true };
    },
    countFamilyRoomPhotos: async id => db.roomPhotos.get(id) ?? 0,
    addFamilyRoomPhoto: async input => {
      db.files.push(input.image.key);
      db.roomPhotos.set(
        input.roomId,
        (db.roomPhotos.get(input.roomId) ?? 0) + 1
      );
    },
    countBooks: async id => db.books.get(id) ?? 0,
    addBook: async input => {
      db.books.set(input.memorialId, (db.books.get(input.memorialId) ?? 0) + 1);
      return nextId++;
    },
    addBookPage: async () => void (db.pages += 1),
    hasFakePoster: async () => db.posters > 0,
    addPoster: async () => void (db.posters += 1),
  };
  return { store, db };
}

const passwords = {
  admin: "a",
  user: "b",
  privateMemorial: "c",
  familyRoom: "d",
};

describe("가짜 자료 넣기", () => {
  it("처음에는 회원·추모관·안장 기록·사진·편지·가족관·이북·포스터를 넣는다", async () => {
    const { store, db } = memoryStore();
    const made = await runFakeSeed(store, passwords);
    expect(db.events.slice(0, 2)).toEqual(["marker", "admin"]);
    expect(made).toMatchObject({
      admin: 1,
      users: 3,
      interments: 30,
      memorials: 6,
      familyRooms: 1,
      familyRoomPhotos: 2,
      books: 1,
      bookPages: 3,
      posters: 1,
      familyMembers: 1,
    });
    expect(made.photos).toBe(
      FAKE_MEMORIALS.reduce((sum, m) => sum + m.photos, 0)
    );
    // 작성 중(pending) 추모관에는 편지를 넣지 않는다 (실제 서비스와 같은 규칙)
    expect(made.letters).toBe(
      FAKE_MEMORIALS.filter(m => m.status === "published").reduce(
        (sum, m) => sum + m.letters,
        0
      )
    );
    expect(db.files.some(key => key.startsWith("family-rooms/"))).toBe(true);
  });

  it("두 번 돌려도 같은 것을 또 넣지 않는다", async () => {
    const { store, db } = memoryStore();
    await runFakeSeed(store, passwords);
    const before = JSON.stringify([
      ...db.users,
      ...db.memorials,
      db.pages,
      db.posters,
    ]);
    const again = await runFakeSeed(store, passwords);
    expect(db.events.filter(event => event === "marker")).toHaveLength(1);
    expect(Object.values(again).every(n => n === 0)).toBe(true);
    expect(
      JSON.stringify([...db.users, ...db.memorials, db.pages, db.posters])
    ).toBe(before);
  });

  it("표식 없는 기존 자료가 있으면 관리자나 가짜 자료를 만들지 않는다", async () => {
    const { store, db } = memoryStore();
    db.users.set(null, 1);
    await expect(runFakeSeed(store, passwords)).rejects.toBeInstanceOf(
      UnsafeFakeSeedDatabaseError
    );
    expect(db.events).toEqual([]);

    db.users.clear();
    db.interments.set(42, 1);
    await expect(runFakeSeed(store, passwords)).rejects.toBeInstanceOf(
      UnsafeFakeSeedDatabaseError
    );
    expect(db.events).toEqual([]);
  });
});

describe("작업장 발송과 정상 발송", () => {
  beforeEach(() => {
    vi.resetModules();
    createTransportMock.mockClear();
    sendMailMock.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("알림톡: 바깥으로 요청하지 않고 가짜 번호를 돌려준다", async () => {
    vi.stubEnv("SOMANG_FAKE", "1");
    expect(isFakeMode()).toBe(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendAlimtalk, getAlimtalkConfigStatus } = await import(
      "./_core/alimtalk"
    );
    expect(getAlimtalkConfigStatus().enabled).toBe(true);
    const result = await sendAlimtalk("010-0000-1234", {
      templateCode: "",
      subject: "시험 010-9876-5432",
      message: "시험",
      buttons: [],
    });
    expect(result.messageId).toMatch(/^fake-/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(String(log.mock.calls[0][0])).toContain("1234");
    expect(String(log.mock.calls[0][0])).not.toContain("010-0000-1234");
    expect(String(log.mock.calls[0][0])).not.toContain("9876");
    expect(String(log.mock.calls[0][0])).toContain("5432");
  });

  it("메일: 메일 서버에 연결하지 않고 기록만 남긴다", async () => {
    vi.stubEnv("SOMANG_FAKE", "1");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendEmail, getEmailConfigStatus } = await import("./_core/email");
    expect(getEmailConfigStatus().enabled).toBe(true);
    await expect(
      sendEmail({
        to: "someone@example.invalid",
        subject: "제작 문의 접수 010-9876-5432",
        text: "시험",
      })
    ).resolves.toBeUndefined();
    expect(String(log.mock.calls[0][0])).toContain("[가짜 메일]");
    expect(String(log.mock.calls[0][0])).not.toContain("someone@");
    expect(String(log.mock.calls[0][0])).not.toContain("9876");
    expect(String(log.mock.calls[0][0])).toContain("5432");
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("가짜 모드가 꺼지면 알림톡 발송 요청을 한 번 한다", async () => {
    vi.stubEnv("SOMANG_FAKE", "");
    for (const key of [
      "ALIGO_API_KEY",
      "ALIGO_USER_ID",
      "ALIGO_SENDER_KEY",
      "ALIGO_SENDER",
      "ALIGO_TPL_REMINDER_CONFIRM",
      "ALIGO_TPL_REMINDER_DAY_BEFORE",
      "ALIGO_TPL_VERIFY_CODE",
    ]) {
      vi.stubEnv(key, "fake-test-value");
    }
    vi.stubEnv("ALIGO_SENDER", "01000001234");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ code: 0, info: { mid: 42 } }),
    } as Response);
    const { sendAlimtalk } = await import("./_core/alimtalk");
    await expect(
      sendAlimtalk("010-0000-1234", {
        templateCode: "fake-template",
        subject: "시험",
        message: "시험",
        buttons: [],
      })
    ).resolves.toEqual({ messageId: "42" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("가짜 모드가 꺼지면 메일을 한 번 보낸다", async () => {
    vi.stubEnv("SOMANG_FAKE", "");
    vi.stubEnv("SMTP_HOST", "smtp.example.invalid");
    vi.stubEnv("SMTP_USER", "fake-user");
    vi.stubEnv("SMTP_PASSWORD", "fake-password");
    vi.stubEnv("SMTP_FROM", "sender@example.invalid");
    const { sendEmail } = await import("./_core/email");
    await sendEmail({
      to: "someone@example.invalid",
      subject: "시험",
      text: "시험",
    });
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it("제목에서 긴 번호만 끝 네 자리를 남긴다", () => {
    expect(maskNumbersForFakeLog("문의 010-1234-5678, 접수 12345")).toBe(
      "문의 *******5678, 접수 12345"
    );
  });
});
