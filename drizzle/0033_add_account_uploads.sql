CREATE TABLE IF NOT EXISTS `account_uploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `storageKey` varchar(500) NOT NULL,
  `bytes` bigint NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `purgedAt` timestamp NULL,
  CONSTRAINT `account_uploads_id` PRIMARY KEY (`id`),
  CONSTRAINT `account_uploads_storageKey_unique` UNIQUE (`storageKey`),
  INDEX `account_uploads_user_created_idx` (`userId`, `createdAt`)
);
