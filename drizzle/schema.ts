import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", [
    "pending",
    "approved",
    "rejected",
  ])
    .default("approved")
    .notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [
  index("users_email_idx").on(table.email),
  index("users_approvalStatus_idx").on(table.approvalStatus),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const memorials = mysqlTable("memorials", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  role: varchar("role", { length: 80 }).notNull(),
  birthDate: varchar("birthDate", { length: 20 }).notNull(),
  deathDate: varchar("deathDate", { length: 20 }).notNull(),
  church: varchar("church", { length: 160 }).default("소망교회").notNull(),
  familyContact: varchar("familyContact", { length: 120 }),
  familyPhone: varchar("familyPhone", { length: 80 }),
  verse: text("verse"),
  verseRef: varchar("verseRef", { length: 120 }),
  summary: varchar("summary", { length: 255 }).notNull(),
  summaryDisplaySize: varchar("summaryDisplaySize", { length: 20 })
    .default("auto")
    .notNull(),
  story: text("story").notNull(),
  storyDisplaySize: varchar("storyDisplaySize", { length: 20 })
    .default("auto")
    .notNull(),
  servicePlace: varchar("servicePlace", { length: 255 }),
  serviceTime: varchar("serviceTime", { length: 40 }),
  memorialDay: varchar("memorialDay", { length: 40 }),
  visibility: mysqlEnum("visibility", ["public", "link", "private"])
    .default("public")
    .notNull(),
  accessPasswordHash: varchar("accessPasswordHash", { length: 128 }),
  status: mysqlEnum("status", ["pending", "published", "private"])
    .default("published")
    .notNull(),
  timelineJson: text("timelineJson"),
  managerMemo: text("managerMemo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Memorial = typeof memorials.$inferSelect;
export type InsertMemorial = typeof memorials.$inferInsert;

export const memorialLetters = mysqlTable(
  "memorial_letters",
  {
    id: int("id").autoincrement().primaryKey(),
    memorialId: int("memorialId").references(() => memorials.id, {
      onDelete: "cascade",
    }),
    recipientName: varchar("recipientName", { length: 120 }),
    recipientRole: varchar("recipientRole", { length: 80 }),
    author: varchar("author", { length: 80 }).notNull(),
    content: text("content").notNull(),
    status: mysqlEnum("status", ["published", "hidden"])
      .default("published")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_letters_memorialId_idx").on(table.memorialId),
    index("memorial_letters_createdAt_idx").on(table.createdAt),
  ]
);

export type MemorialLetter = typeof memorialLetters.$inferSelect;
export type InsertMemorialLetter = typeof memorialLetters.$inferInsert;

export const memorialGalleryPhotos = mysqlTable(
  "memorial_gallery_photos",
  {
    id: int("id").autoincrement().primaryKey(),
    memorialId: int("memorialId")
      .notNull()
      .references(() => memorials.id, { onDelete: "cascade" }),
    photoUrl: text("photoUrl").notNull(),
    photoKey: varchar("photoKey", { length: 500 }).notNull(),
    caption: varchar("caption", { length: 500 }),
    year: varchar("year", { length: 20 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    isRepresentative: int("isRepresentative").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_gallery_photos_memorialId_idx").on(table.memorialId),
    index("memorial_gallery_photos_sortOrder_idx").on(table.sortOrder),
  ]
);

export type MemorialGalleryPhoto =
  typeof memorialGalleryPhotos.$inferSelect;
export type InsertMemorialGalleryPhoto =
  typeof memorialGalleryPhotos.$inferInsert;

export const memorialVideos = mysqlTable(
  "memorial_videos",
  {
    id: int("id").autoincrement().primaryKey(),
    memorialId: int("memorialId")
      .notNull()
      .references(() => memorials.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    youtubeVideoId: varchar("youtubeVideoId", { length: 50 }).notNull(),
    isVisible: int("isVisible").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_videos_memorialId_idx").on(table.memorialId),
    index("memorial_videos_sortOrder_idx").on(table.sortOrder),
  ]
);

export type MemorialVideo = typeof memorialVideos.$inferSelect;
export type InsertMemorialVideo = typeof memorialVideos.$inferInsert;

export const memorialBooks = mysqlTable(
  "memorial_books",
  {
    id: int("id").autoincrement().primaryKey(),
    memorialId: int("memorialId")
      .notNull()
      .references(() => memorials.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    subtitle: varchar("subtitle", { length: 300 }),
    coverPhotoUrl: text("coverPhotoUrl"),
    coverPhotoKey: varchar("coverPhotoKey", { length: 500 }),
    publishedYear: varchar("publishedYear", { length: 20 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_books_memorialId_idx").on(table.memorialId),
    index("memorial_books_sortOrder_idx").on(table.sortOrder),
  ]
);

export type MemorialBook = typeof memorialBooks.$inferSelect;
export type InsertMemorialBook = typeof memorialBooks.$inferInsert;

export const memorialBookPages = mysqlTable(
  "memorial_book_pages",
  {
    id: int("id").autoincrement().primaryKey(),
    bookId: int("bookId")
      .notNull()
      .references(() => memorialBooks.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }),
    content: text("content"),
    photoUrl: text("photoUrl"),
    photoKey: varchar("photoKey", { length: 500 }),
    dateYear: int("dateYear"),
    dateMonth: int("dateMonth"),
    dateDay: int("dateDay"),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_book_pages_bookId_idx").on(table.bookId),
    index("memorial_book_pages_date_idx").on(
      table.dateYear,
      table.dateMonth,
      table.dateDay
    ),
  ]
);

export type MemorialBookPage = typeof memorialBookPages.$inferSelect;
export type InsertMemorialBookPage =
  typeof memorialBookPages.$inferInsert;

export const memorialFamilyRooms = mysqlTable(
  "memorial_family_rooms",
  {
    id: int("id").autoincrement().primaryKey(),
    memorialId: int("memorialId")
      .notNull()
      .references(() => memorials.id, { onDelete: "cascade" })
      .unique(),
    passwordHash: varchar("passwordHash", { length: 128 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    intro: text("intro").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_family_rooms_memorialId_idx").on(table.memorialId),
  ]
);

export type MemorialFamilyRoom = typeof memorialFamilyRooms.$inferSelect;
export type InsertMemorialFamilyRoom =
  typeof memorialFamilyRooms.$inferInsert;

export const memorialReminderSubscriptions = mysqlTable(
  "memorial_reminder_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    memorialId: int("memorialId")
      .notNull()
      .references(() => memorials.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 30 }).notNull(),
    memorialDay: varchar("memorialDay", { length: 40 }),
    status: mysqlEnum("status", ["active", "cancelled"])
      .default("active")
      .notNull(),
    consentAt: timestamp("consentAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("memorial_reminders_memorialId_idx").on(table.memorialId),
    uniqueIndex("memorial_reminders_memorial_phone_unique").on(
      table.memorialId,
      table.phone
    ),
  ]
);

export type MemorialReminderSubscription =
  typeof memorialReminderSubscriptions.$inferSelect;
export type InsertMemorialReminderSubscription =
  typeof memorialReminderSubscriptions.$inferInsert;
