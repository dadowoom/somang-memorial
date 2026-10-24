CREATE TABLE IF NOT EXISTS `account_upload_usage` (
  `userId` int NOT NULL PRIMARY KEY,
  `usedBytes` bigint NOT NULL DEFAULT 0,
  `dayKey` varchar(10) NOT NULL DEFAULT '',
  `dayCount` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `upload_quota_bootstrap` (
  `id` int NOT NULL PRIMARY KEY,
  `completedAt` timestamp NULL
);
--> statement-breakpoint
ALTER TABLE `account_uploads` ADD COLUMN `purgePendingAt` timestamp NULL;
