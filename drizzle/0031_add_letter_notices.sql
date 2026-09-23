-- 새 편지 알림톡 (2026-09-23).
-- 추모관마다 "어디까지 알렸는지"와, 알림을 끈 회원을 적는 표 두 개를 새로 만든다.
-- 기존 표는 바꾸지 않는다. 지금까지 온 편지는 이미 알린 것으로 적어 두어,
-- 알림을 처음 켤 때 옛 편지로 알림이 가지 않게 한다.
CREATE TABLE IF NOT EXISTS `memorial_letter_notices` (
  `memorialId` int NOT NULL,
  `lastLetterId` int NOT NULL DEFAULT 0,
  `lastSentDate` varchar(10) NULL,
  `lastSentAt` timestamp NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memorial_letter_notices_memorialId` PRIMARY KEY (`memorialId`),
  CONSTRAINT `memorial_letter_notices_memorialId_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_letter_notice_optouts` (
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `user_letter_notice_optouts_userId` PRIMARY KEY (`userId`),
  CONSTRAINT `user_letter_notice_optouts_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT IGNORE INTO `memorial_letter_notices` (`memorialId`, `lastLetterId`)
SELECT `m`.`id`, COALESCE(MAX(`l`.`id`), 0)
FROM `memorials` `m`
LEFT JOIN `memorial_letters` `l` ON `l`.`memorialId` = `m`.`id`
GROUP BY `m`.`id`;
