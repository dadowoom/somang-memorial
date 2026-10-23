import { and, eq, inArray, sql } from "drizzle-orm";
import {
  kioskPosters,
  memorialBookPages,
  memorialBooks,
  memorialFamilyRoomPhotos,
  memorialFamilyRooms,
  memorialGalleryPhotos,
  memorialLetters,
  memorials,
  somangIntermentRecords,
  users,
} from "../drizzle/schema";
import {
  addMemorialFamilyMember,
  createBootstrapAdmin,
  createLocalUser,
  createMemorialLetter,
  getDb,
  getUserByEmail,
  hasAdminUser,
  hashFamilyRoomPassword,
  hashMemorialAccessPassword,
} from "./db";
import { storagePut } from "./storage";
import { normalizeIntermentName } from "../shared/parentFinder";
import {
  FAKE_POSTER_CAPTION,
  type FakeImage,
  type FakeSeedStore,
} from "./fakeSeed";

/** 작업장 DB 에 가짜 자료를 넣는 실제 통로. 시험에서는 메모리 통로로 바꿔 끼운다. */
export async function createDbFakeSeedStore(): Promise<FakeSeedStore> {
  const db = await getDb();
  if (!db) throw new Error("DB 에 연결하지 못했습니다 (DATABASE_URL 확인).");

  const putImage = async (image: FakeImage) => {
    const { key, url } = await storagePut(image.key, image.buffer, "image/png");
    return { key, url };
  };
  const count = async (rows: Promise<{ n: number }[]>) =>
    Number((await rows)[0]?.n ?? 0);

  return {
    hasAdmin: () => hasAdminUser(),
    async createAdmin(password) {
      await createBootstrapAdmin(password);
    },

    async findUserIdByEmail(email) {
      return (await getUserByEmail(email))?.id ?? null;
    },
    async createUser(input) {
      await createLocalUser(input);
      const user = await getUserByEmail(input.email);
      if (!user)
        throw new Error(`가짜 회원을 만들지 못했습니다: ${input.email}`);
      return user.id;
    },

    async existingIntermentSourceIds(sourceIds) {
      const rows = await db
        .select({ sourceId: somangIntermentRecords.sourceId })
        .from(somangIntermentRecords)
        .where(inArray(somangIntermentRecords.sourceId, sourceIds));
      return new Set(rows.map(row => row.sourceId));
    },
    async insertInterments(rows) {
      await db.insert(somangIntermentRecords).values(
        rows.map(row => ({
          ...row,
          nameNormalized: normalizeIntermentName(row.name),
          sourcePayload: JSON.stringify({ source: "fake-seed", ...row }),
        }))
      );
    },
    async findIntermentIdBySourceId(sourceId) {
      const rows = await db
        .select({ id: somangIntermentRecords.id })
        .from(somangIntermentRecords)
        .where(eq(somangIntermentRecords.sourceId, sourceId))
        .limit(1);
      return rows[0]?.id ?? null;
    },

    async findMemorialIdBySlug(slug) {
      const rows = await db
        .select({ id: memorials.id })
        .from(memorials)
        .where(eq(memorials.slug, slug))
        .limit(1);
      return rows[0]?.id ?? null;
    },
    async createMemorial(input) {
      const [result] = await db.insert(memorials).values({
        slug: input.slug,
        name: input.name,
        role: input.role,
        birthDate: input.birthDate,
        deathDate: input.deathDate,
        church: "소망교회",
        createdByUserId: input.ownerId,
        intermentRecordId: input.intermentRecordId,
        summary: input.summary,
        story: `[가짜 자료] ${input.name} ${input.role}님의 이야기 예시입니다. 작업장에서만 보입니다.`,
        memorialDay: `매년 ${input.deathDate.slice(5, 7)}월 ${input.deathDate.slice(8, 10)}일`,
        visibility: input.visibility,
        accessPasswordHash: input.accessPassword
          ? hashMemorialAccessPassword(input.accessPassword)
          : null,
        status: input.status,
        timelineJson: JSON.stringify([
          {
            year: input.birthDate.slice(0, 4),
            title: "태어남",
            description: "[가짜]",
          },
        ]),
      });
      return Number((result as { insertId?: number }).insertId);
    },

    countGalleryPhotos: memorialId =>
      count(
        db
          .select({ n: sql<number>`COUNT(*)` })
          .from(memorialGalleryPhotos)
          .where(eq(memorialGalleryPhotos.memorialId, memorialId))
      ),
    async addGalleryPhoto(input) {
      const { key, url } = await putImage(input.image);
      await db.insert(memorialGalleryPhotos).values({
        memorialId: input.memorialId,
        photoUrl: url,
        photoKey: key,
        caption: input.caption,
        sortOrder: input.sortOrder,
        isRepresentative: input.isRepresentative ? 1 : 0,
      });
    },

    countLetters: memorialId =>
      count(
        db
          .select({ n: sql<number>`COUNT(*)` })
          .from(memorialLetters)
          .where(eq(memorialLetters.memorialId, memorialId))
      ),
    async addLetter(input) {
      await createMemorialLetter(input);
    },

    async addFamilyMember(input) {
      const result = await addMemorialFamilyMember(input);
      return result.added;
    },

    async ensureFamilyRoom(input) {
      const find = async () =>
        (
          await db
            .select({ id: memorialFamilyRooms.id })
            .from(memorialFamilyRooms)
            .where(eq(memorialFamilyRooms.memorialId, input.memorialId))
            .limit(1)
        )[0]?.id ?? null;
      const existing = await find();
      if (existing) return { roomId: existing, created: false };
      await db.insert(memorialFamilyRooms).values({
        memorialId: input.memorialId,
        title: input.title,
        intro: input.intro,
        passwordHash: hashFamilyRoomPassword(input.password),
      });
      const roomId = await find();
      if (!roomId) throw new Error("가짜 가족관을 만들지 못했습니다.");
      return { roomId, created: true };
    },
    countFamilyRoomPhotos: roomId =>
      count(
        db
          .select({ n: sql<number>`COUNT(*)` })
          .from(memorialFamilyRoomPhotos)
          .where(eq(memorialFamilyRoomPhotos.familyRoomId, roomId))
      ),
    async addFamilyRoomPhoto(input) {
      const { key, url } = await putImage(input.image);
      await db.insert(memorialFamilyRoomPhotos).values({
        familyRoomId: input.roomId,
        photoUrl: url,
        photoKey: key,
        caption: input.caption,
      });
    },

    countBooks: memorialId =>
      count(
        db
          .select({ n: sql<number>`COUNT(*)` })
          .from(memorialBooks)
          .where(eq(memorialBooks.memorialId, memorialId))
      ),
    async addBook(input) {
      const cover = await putImage(input.cover);
      const [result] = await db.insert(memorialBooks).values({
        memorialId: input.memorialId,
        title: input.title,
        subtitle: input.subtitle,
        coverPhotoUrl: cover.url,
        coverPhotoKey: cover.key,
      });
      return Number((result as { insertId?: number }).insertId);
    },
    async addBookPage(input) {
      const photo = input.image ? await putImage(input.image) : null;
      await db.insert(memorialBookPages).values({
        bookId: input.bookId,
        title: input.title,
        content: input.content,
        photoUrl: photo?.url ?? null,
        photoKey: photo?.key ?? null,
        sortOrder: input.sortOrder,
      });
    },

    async hasFakePoster() {
      const rows = await db
        .select({ id: kioskPosters.id })
        .from(kioskPosters)
        .where(eq(kioskPosters.caption, FAKE_POSTER_CAPTION))
        .limit(1);
      return rows.length > 0;
    },
    async addPoster(input) {
      const { key, url } = await putImage(input.image);
      await db.insert(kioskPosters).values({
        imageUrl: url,
        imageKey: key,
        caption: input.caption,
        displaySeconds: 8,
        sortOrder: 1,
        isActive: 1,
      });
    },
  };
}

/** 지금 DB 에 실제 회원으로 보이는 자료가 있는지(가짜 표식 없는 회원 수). 안내용. */
export async function countNonFakeUsers(fakeDomain: string) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(users)
    .where(
      and(
        sql`${users.email} NOT LIKE ${`%@${fakeDomain}`}`,
        sql`${users.email} NOT LIKE ${"%@somang-memorial.invalid"}`
      )
    );
  return Number(rows[0]?.n ?? 0);
}
