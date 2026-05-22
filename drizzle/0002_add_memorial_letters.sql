CREATE TABLE `memorial_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memorialId` int NOT NULL,
	`author` varchar(80) NOT NULL,
	`content` text NOT NULL,
	`status` enum('published','hidden') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorial_letters_id` PRIMARY KEY(`id`),
	CONSTRAINT `memorial_letters_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memorial_letters_memorialId_idx` ON `memorial_letters` (`memorialId`);
--> statement-breakpoint
CREATE INDEX `memorial_letters_createdAt_idx` ON `memorial_letters` (`createdAt`);
