CREATE TABLE `memorial_family_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memorialId` int NOT NULL,
	`passwordHash` varchar(128) NOT NULL,
	`title` varchar(160) NOT NULL,
	`intro` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memorial_family_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `memorial_family_rooms_memorialId_unique` UNIQUE(`memorialId`)
);
--> statement-breakpoint
ALTER TABLE `memorial_family_rooms` ADD CONSTRAINT `memorial_family_rooms_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `memorial_family_rooms_memorialId_idx` ON `memorial_family_rooms` (`memorialId`);
--> statement-breakpoint
INSERT INTO `memorial_family_rooms` (`memorialId`, `passwordHash`, `title`, `intro`)
SELECT
  `id`,
  SHA2(CONCAT('somang-family:', '1234'), 256),
  '김영수 장로님 가족관',
  '가족들이 서로에게만 남기고 싶은 기억과 안부, 조용한 고백을 모아두는 공간입니다. 공개 추모관에 담기 어려운 개인적인 마음은 이곳에서 천천히 이어갈 수 있습니다.'
FROM `memorials`
WHERE `slug` = 'kim-youngsu-elder'
  AND NOT EXISTS (
    SELECT 1
    FROM `memorial_family_rooms`
    WHERE `memorial_family_rooms`.`memorialId` = `memorials`.`id`
  );
