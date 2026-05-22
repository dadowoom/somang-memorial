ALTER TABLE `memorials` ADD `memorialDay` varchar(40);
--> statement-breakpoint
UPDATE `memorials`
SET `memorialDay` = CASE `slug`
  WHEN 'kim-youngsu-elder' THEN '매년 4월 7일'
  WHEN 'kim-yohan-elder' THEN '매년 6월 12일'
  WHEN 'lee-soonja-kwonsa' THEN '매년 9월 3일'
  WHEN 'kim-somang-kwonsa' THEN '매년 5월 22일'
  ELSE `memorialDay`
END
WHERE `slug` IN ('kim-youngsu-elder', 'kim-yohan-elder', 'lee-soonja-kwonsa', 'kim-somang-kwonsa');
--> statement-breakpoint
CREATE TABLE `memorial_reminder_subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `memorialId` int NOT NULL,
  `phone` varchar(30) NOT NULL,
  `memorialDay` varchar(40),
  `status` enum('active','cancelled') NOT NULL DEFAULT 'active',
  `consentAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memorial_reminder_subscriptions_id` PRIMARY KEY(`id`),
  CONSTRAINT `memorial_reminder_subscriptions_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memorial_reminders_memorialId_idx` ON `memorial_reminder_subscriptions` (`memorialId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `memorial_reminders_memorial_phone_unique` ON `memorial_reminder_subscriptions` (`memorialId`,`phone`);
