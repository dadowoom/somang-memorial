import { deflateSync } from "zlib";

/**
 * 작업장 가짜 자료 (2026-10-23). `pnpm run seed:fake` 가 넣는다.
 *
 * 저장소가 공개라 실제 사람·번호·사진은 하나도 쓰지 않는다. 이름은 "김소망" 같은
 * 예시, 이메일은 .invalid(어디에도 없는 주소), 번호는 010-0000-00xx, 사진은 코드가
 * 그린 단색 그림이다. 두 번 돌려도 같은 것을 또 넣지 않는다(있으면 건너뜀).
 */

// ── 단색 PNG 그림 (작은 예시 사진) ─────────────────────────────────────────
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** 위에서 아래로 색이 옅어지는 단색 그림. 가짜 사진 자리에 쓴다. */
export function makeFakePng(
  width: number,
  height: number,
  rgb: [number, number, number]
) {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    const fade = 1 - (y / height) * 0.35;
    for (let x = 0; x < width; x += 1) {
      row[1 + x * 3] = Math.round(rgb[0] * fade);
      row[2 + x * 3] = Math.round(rgb[1] * fade);
      row[3 + x * 3] = Math.round(rgb[2] * fade);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 색 깊이
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const COLORS: [number, number, number][] = [
  [196, 178, 150],
  [150, 170, 190],
  [170, 190, 160],
  [200, 160, 160],
  [180, 170, 200],
];

// ── 가짜 자료 ───────────────────────────────────────────────────────────────
export const FAKE_EMAIL_DOMAIN = "example.invalid";
export const FAKE_ADMIN_EMAIL = `admin@${FAKE_EMAIL_DOMAIN}`;
export const FAKE_INTERMENT_SOURCE_BASE = -800000000;
export const FAKE_POSTER_CAPTION = "[가짜] 작업장 대기 화면 예시";

export const FAKE_USERS = [
  {
    key: "family1",
    name: "가짜가족 하나",
    email: `family1@${FAKE_EMAIL_DOMAIN}`,
    phone: "010-0000-0001",
  },
  {
    key: "family2",
    name: "가짜가족 둘",
    email: `family2@${FAKE_EMAIL_DOMAIN}`,
    phone: "010-0000-0002",
  },
  {
    key: "family3",
    name: "가짜가족 셋",
    email: `family3@${FAKE_EMAIL_DOMAIN}`,
    phone: "010-0000-0003",
  },
] as const;

type FakeUserKey = (typeof FAKE_USERS)[number]["key"];

export type FakeMemorialSpec = {
  slug: string;
  name: string;
  role: string;
  birthDate: string;
  deathDate: string;
  owner: FakeUserKey;
  visibility: "public" | "private";
  status: "published" | "pending";
  summary: string;
  photos: number;
  letters: number;
  familyRoom?: boolean;
  book?: boolean;
  invite?: FakeUserKey;
  /** 이 순번의 가짜 안장 기록과 잇는다 (부모님 찾기로 만든 것처럼). */
  intermentIndex?: number;
};

export const FAKE_MEMORIALS: FakeMemorialSpec[] = [
  {
    slug: "fake-kim-somang",
    name: "김소망",
    role: "권사",
    birthDate: "1933-01-05",
    deathDate: "2024-05-22",
    owner: "family1",
    visibility: "public",
    status: "published",
    summary: "[가짜] 기도로 가족을 지킨 분",
    photos: 3,
    letters: 3,
    familyRoom: true,
    book: true,
    invite: "family3",
    intermentIndex: 1,
  },
  {
    slug: "fake-lee-mideum",
    name: "이믿음",
    role: "장로",
    birthDate: "1940-03-12",
    deathDate: "2023-11-02",
    owner: "family1",
    visibility: "public",
    status: "published",
    summary: "[가짜] 교회를 섬긴 장로님",
    photos: 2,
    letters: 2,
  },
  {
    slug: "fake-park-sarang",
    name: "박사랑",
    role: "집사",
    birthDate: "1951-07-30",
    deathDate: "2025-02-14",
    owner: "family2",
    visibility: "public",
    status: "published",
    summary: "[가짜] 이웃을 사랑한 집사님",
    photos: 2,
    letters: 2,
  },
  {
    slug: "fake-choi-huimang",
    name: "최희망",
    role: "성도",
    birthDate: "1962-12-01",
    deathDate: "2025-08-09",
    owner: "family2",
    visibility: "public",
    status: "published",
    summary: "[가짜] 웃음을 나눈 성도님",
    photos: 1,
    letters: 1,
  },
  {
    slug: "fake-jung-eunhye",
    name: "정은혜",
    role: "권사",
    birthDate: "1938-09-18",
    deathDate: "2022-04-03",
    owner: "family1",
    visibility: "private",
    status: "published",
    summary: "[가짜] 비공개 추모관 예시",
    photos: 2,
    letters: 0,
  },
  {
    slug: "fake-han-pyeonghwa",
    name: "한평화",
    role: "집사",
    birthDate: "1948-02-27",
    deathDate: "2026-01-15",
    owner: "family3",
    visibility: "public",
    status: "pending",
    summary: "[가짜] 작성 중인 추모관 예시",
    photos: 1,
    letters: 0,
  },
];

const LETTER_TEXTS = [
  "[가짜 편지] 늘 기도해 주셔서 감사했습니다. 보고 싶습니다.",
  "[가짜 편지] 주일마다 웃으며 맞아 주시던 모습이 생각납니다.",
  "[가짜 편지] 가르쳐 주신 찬송을 오늘도 부릅니다.",
];

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN = [
  "소망",
  "믿음",
  "사랑",
  "희망",
  "은혜",
  "평안",
  "기쁨",
  "온유",
  "충성",
  "화평",
];

/** 가짜 안장 기록 30건. 원본 번호는 -800000001 부터 아래로. */
export function fakeIntermentRows() {
  return Array.from({ length: 30 }, (_, index) => {
    const n = index + 1;
    const name =
      n === 1 ? "김소망" : `${SURNAMES[index % 10]}${GIVEN[(index * 3) % 10]}`;
    const birthYear = 1925 + (index % 30);
    const deathYear = 2000 + (index % 26);
    const month = String((index % 12) + 1).padStart(2, "0");
    const day = String((index % 27) + 1).padStart(2, "0");
    return {
      sourceId: FAKE_INTERMENT_SOURCE_BASE - n,
      name,
      role: ["권사", "장로", "집사", "성도"][index % 4],
      // 4건 중 1건은 생년월일을 모르는 기록 (실제 명단처럼)
      birthDate:
        index % 4 === 3 ? "0000-00-00" : `${birthYear}-${month}-${day}`,
      deathDate: `${deathYear}-${month}-${day}`,
      burialPlace: index % 5 === 4 ? "[가짜] 다른 장지" : "소망동산",
      burialDate: `${deathYear}-${month}-${day}`,
    };
  });
}

// ── 넣는 순서 ───────────────────────────────────────────────────────────────
export type FakeImage = { key: string; buffer: Buffer };

/** 실제 DB·파일 대신 시험에서 바꿔 끼울 수 있게 저장 통로를 받는다. */
export interface FakeSeedStore {
  currentDatabaseName(): Promise<string | null>;
  countNonFakeRows(): Promise<Record<string, number>>;
  hasAdmin(): Promise<boolean>;
  createAdmin(password: string): Promise<void>;
  findUserIdByEmail(email: string): Promise<number | null>;
  createUser(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<number>;
  existingIntermentSourceIds(sourceIds: number[]): Promise<Set<number>>;
  insertInterments(rows: ReturnType<typeof fakeIntermentRows>): Promise<void>;
  findIntermentIdBySourceId(sourceId: number): Promise<number | null>;
  findMemorialIdBySlug(slug: string): Promise<number | null>;
  createMemorial(
    input: FakeMemorialSpec & {
      ownerId: number;
      accessPassword: string | null;
      intermentRecordId: number | null;
    }
  ): Promise<number>;
  countGalleryPhotos(memorialId: number): Promise<number>;
  addGalleryPhoto(input: {
    memorialId: number;
    image: FakeImage;
    caption: string;
    sortOrder: number;
    isRepresentative: boolean;
  }): Promise<void>;
  countLetters(memorialId: number): Promise<number>;
  addLetter(input: {
    memorialSlug: string;
    author: string;
    content: string;
  }): Promise<void>;
  addFamilyMember(input: {
    memorialId: number;
    userId: number;
    invitedByUserId: number;
  }): Promise<boolean>;
  ensureFamilyRoom(input: {
    memorialId: number;
    title: string;
    intro: string;
    password: string;
  }): Promise<{ roomId: number; created: boolean }>;
  countFamilyRoomPhotos(roomId: number): Promise<number>;
  addFamilyRoomPhoto(input: {
    roomId: number;
    image: FakeImage;
    caption: string;
  }): Promise<void>;
  countBooks(memorialId: number): Promise<number>;
  addBook(input: {
    memorialId: number;
    title: string;
    subtitle: string;
    cover: FakeImage;
  }): Promise<number>;
  addBookPage(input: {
    bookId: number;
    title: string;
    content: string;
    image: FakeImage | null;
    sortOrder: number;
  }): Promise<void>;
  hasFakePoster(): Promise<boolean>;
  addPoster(input: { image: FakeImage; caption: string }): Promise<void>;
}

export type FakeSeedPasswords = {
  admin: string;
  user: string;
  privateMemorial: string;
  familyRoom: string;
};

export type FakeSeedSummary = Record<string, number>;

export class UnsafeFakeSeedDatabaseError extends Error {}

function image(
  folder: string,
  name: string,
  colorIndex: number,
  size: [number, number] = [640, 480]
): FakeImage {
  return {
    key: `${folder}/${name}.png`,
    buffer: makeFakePng(size[0], size[1], COLORS[colorIndex % COLORS.length]),
  };
}

export async function runFakeSeed(
  store: FakeSeedStore,
  passwords: FakeSeedPasswords
) {
  const databaseName = await store.currentDatabaseName();
  if (!databaseName?.startsWith("somang_workshop")) {
    throw new UnsafeFakeSeedDatabaseError(
      "연결된 DB 이름이 somang_workshop 으로 시작하지 않습니다. 쓰기 전에 멈춥니다."
    );
  }
  const nonFakeRows = await store.countNonFakeRows();
  const found = Object.entries(nonFakeRows).filter(([, count]) => count !== 0);
  if (found.length > 0) {
    throw new UnsafeFakeSeedDatabaseError(
      `가짜가 아닌 자료가 있습니다: ${found.map(([table, count]) => `${table} ${count}줄`).join(", ")}. 쓰기 전에 멈춥니다.`
    );
  }

  const made: FakeSeedSummary = {
    admin: 0,
    users: 0,
    interments: 0,
    memorials: 0,
    photos: 0,
    letters: 0,
    familyMembers: 0,
    familyRooms: 0,
    familyRoomPhotos: 0,
    books: 0,
    bookPages: 0,
    posters: 0,
  };

  if (!(await store.hasAdmin())) {
    await store.createAdmin(passwords.admin);
    made.admin += 1;
  }

  const userIds = {} as Record<FakeUserKey, number>;
  for (const user of FAKE_USERS) {
    const existing = await store.findUserIdByEmail(user.email);
    if (existing) {
      userIds[user.key] = existing;
      continue;
    }
    userIds[user.key] = await store.createUser({
      ...user,
      password: passwords.user,
    });
    made.users += 1;
  }

  const interments = fakeIntermentRows();
  const existingSources = await store.existingIntermentSourceIds(
    interments.map(row => row.sourceId)
  );
  const newInterments = interments.filter(
    row => !existingSources.has(row.sourceId)
  );
  if (newInterments.length > 0) {
    await store.insertInterments(newInterments);
    made.interments += newInterments.length;
  }

  for (let index = 0; index < FAKE_MEMORIALS.length; index += 1) {
    const spec = FAKE_MEMORIALS[index];
    let memorialId = await store.findMemorialIdBySlug(spec.slug);
    if (!memorialId) {
      const intermentRecordId = spec.intermentIndex
        ? await store.findIntermentIdBySourceId(
            FAKE_INTERMENT_SOURCE_BASE - spec.intermentIndex
          )
        : null;
      memorialId = await store.createMemorial({
        ...spec,
        ownerId: userIds[spec.owner],
        accessPassword:
          spec.visibility === "private" ? passwords.privateMemorial : null,
        intermentRecordId,
      });
      made.memorials += 1;
    }

    if ((await store.countGalleryPhotos(memorialId)) === 0) {
      for (let photo = 0; photo < spec.photos; photo += 1) {
        await store.addGalleryPhoto({
          memorialId,
          image: image(
            `gallery/${memorialId}`,
            `fake-${photo + 1}`,
            index + photo
          ),
          caption: `[가짜 사진] ${spec.name} ${photo + 1}`,
          sortOrder: photo,
          isRepresentative: photo === 0,
        });
        made.photos += 1;
      }
    }

    if (
      spec.status === "published" &&
      spec.letters > 0 &&
      (await store.countLetters(memorialId)) === 0
    ) {
      for (let letter = 0; letter < spec.letters; letter += 1) {
        await store.addLetter({
          memorialSlug: spec.slug,
          author: `가짜 방문자 ${letter + 1}`,
          content: LETTER_TEXTS[letter % LETTER_TEXTS.length],
        });
        made.letters += 1;
      }
    }

    if (spec.invite) {
      const added = await store.addFamilyMember({
        memorialId,
        userId: userIds[spec.invite],
        invitedByUserId: userIds[spec.owner],
      });
      if (added) made.familyMembers += 1;
    }

    if (spec.familyRoom) {
      const room = await store.ensureFamilyRoom({
        memorialId,
        title: `[가짜] ${spec.name} 가족관`,
        intro: "[가짜] 가족끼리만 보는 공간 예시입니다.",
        password: passwords.familyRoom,
      });
      if (room.created) made.familyRooms += 1;
      if ((await store.countFamilyRoomPhotos(room.roomId)) === 0) {
        for (let photo = 0; photo < 2; photo += 1) {
          await store.addFamilyRoomPhoto({
            roomId: room.roomId,
            image: image(
              `family-rooms/${room.roomId}`,
              `fake-${photo + 1}`,
              photo + 2
            ),
            caption: `[가짜 가족 사진] ${photo + 1}`,
          });
          made.familyRoomPhotos += 1;
        }
      }
    }

    if (spec.book && (await store.countBooks(memorialId)) === 0) {
      const bookId = await store.addBook({
        memorialId,
        title: "[가짜] 신앙의 여정",
        subtitle: `${spec.name} ${spec.role} 이북 예시`,
        cover: image("book-covers", `fake-${memorialId}`, 0, [480, 640]),
      });
      made.books += 1;
      const pages = [
        {
          title: "어린 시절",
          content: "[가짜] 시골 교회에서 처음 신앙을 만났습니다.",
          photo: true,
        },
        {
          title: "가정을 꾸리며",
          content: "[가짜] 가족과 함께 예배를 드렸습니다.",
          photo: false,
        },
        {
          title: "남기신 말씀",
          content: "[가짜] 서로 사랑하라는 말씀을 자주 하셨습니다.",
          photo: true,
        },
      ];
      for (let order = 0; order < pages.length; order += 1) {
        const page = pages[order];
        await store.addBookPage({
          bookId,
          title: page.title,
          content: page.content,
          image: page.photo
            ? image("book-pages", `fake-${bookId}-${order + 1}`, order + 1)
            : null,
          sortOrder: order,
        });
        made.bookPages += 1;
      }
    }
  }

  if (!(await store.hasFakePoster())) {
    await store.addPoster({
      image: image("kiosk-posters", "fake-poster-1", 1, [540, 960]),
      caption: FAKE_POSTER_CAPTION,
    });
    made.posters += 1;
  }

  return made;
}
