ALTER TABLE `memorials` ADD `summaryDisplaySize` varchar(20) NOT NULL DEFAULT 'auto';
--> statement-breakpoint
ALTER TABLE `memorials` ADD `storyDisplaySize` varchar(20) NOT NULL DEFAULT 'auto';
--> statement-breakpoint
CREATE TABLE `memorial_gallery_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memorialId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoKey` varchar(500) NOT NULL,
	`caption` varchar(500),
	`year` varchar(20),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRepresentative` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorial_gallery_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `memorial_gallery_photos_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memorial_gallery_photos_memorialId_idx` ON `memorial_gallery_photos` (`memorialId`);
--> statement-breakpoint
CREATE INDEX `memorial_gallery_photos_sortOrder_idx` ON `memorial_gallery_photos` (`sortOrder`);
--> statement-breakpoint
CREATE TABLE `memorial_videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memorialId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`youtubeVideoId` varchar(50) NOT NULL,
	`isVisible` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorial_videos_id` PRIMARY KEY(`id`),
	CONSTRAINT `memorial_videos_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memorial_videos_memorialId_idx` ON `memorial_videos` (`memorialId`);
--> statement-breakpoint
CREATE INDEX `memorial_videos_sortOrder_idx` ON `memorial_videos` (`sortOrder`);
--> statement-breakpoint
CREATE TABLE `memorial_books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memorialId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`subtitle` varchar(300),
	`coverPhotoUrl` text,
	`coverPhotoKey` varchar(500),
	`publishedYear` varchar(20),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorial_books_id` PRIMARY KEY(`id`),
	CONSTRAINT `memorial_books_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memorial_books_memorialId_idx` ON `memorial_books` (`memorialId`);
--> statement-breakpoint
CREATE INDEX `memorial_books_sortOrder_idx` ON `memorial_books` (`sortOrder`);
--> statement-breakpoint
CREATE TABLE `memorial_book_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`title` varchar(300),
	`content` text,
	`photoUrl` text,
	`photoKey` varchar(500),
	`dateYear` int,
	`dateMonth` int,
	`dateDay` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorial_book_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `memorial_book_pages_bookId_memorial_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `memorial_books`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memorial_book_pages_bookId_idx` ON `memorial_book_pages` (`bookId`);
--> statement-breakpoint
CREATE INDEX `memorial_book_pages_date_idx` ON `memorial_book_pages` (`dateYear`,`dateMonth`,`dateDay`);
