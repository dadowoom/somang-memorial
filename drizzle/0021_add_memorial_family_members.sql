-- 가족 초대 (2026-09-13 결정).
-- 지금은 추모관 주인이 한 명뿐이라 둘째 형제가 가입해도 "관리자에게 요청"에서 끝난다.
-- 주인이 초대 링크를 만들어 가족에게 주면, 그 링크로 들어온 가족이 함께 관리한다.
CREATE TABLE IF NOT EXISTS `memorial_family_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `memorialId` int NOT NULL,
  `userId` int NOT NULL,
  `invitedByUserId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `memorial_family_members_id` PRIMARY KEY (`id`),
  CONSTRAINT `memorial_family_members_memorial_user_unique` UNIQUE (`memorialId`, `userId`)
);
--> statement-breakpoint
CREATE INDEX `memorial_family_members_memorialId_idx` ON `memorial_family_members` (`memorialId`);
--> statement-breakpoint
CREATE INDEX `memorial_family_members_userId_idx` ON `memorial_family_members` (`userId`);
--> statement-breakpoint
ALTER TABLE `memorial_family_members` ADD CONSTRAINT `memorial_family_members_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `memorial_family_members` ADD CONSTRAINT `memorial_family_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `memorial_family_members` ADD CONSTRAINT `memorial_family_members_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- 초대 링크. 비밀번호 재설정 링크와 같은 방식으로 원문 대신 해시만 저장한다.
-- 한 링크를 가족 여러 명이 쓸 수 있고, 기한이 지나거나 주인이 무효화하면 닫힌다.
CREATE TABLE IF NOT EXISTS `memorial_family_invitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `memorialId` int NOT NULL,
  `tokenHash` varchar(128) NOT NULL,
  `createdByUserId` int NULL,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `memorial_family_invitations_id` PRIMARY KEY (`id`),
  CONSTRAINT `memorial_family_invitations_tokenHash_unique` UNIQUE (`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `memorial_family_invitations_memorialId_idx` ON `memorial_family_invitations` (`memorialId`);
--> statement-breakpoint
CREATE INDEX `memorial_family_invitations_expiresAt_idx` ON `memorial_family_invitations` (`expiresAt`);
--> statement-breakpoint
ALTER TABLE `memorial_family_invitations` ADD CONSTRAINT `memorial_family_invitations_memorialId_memorials_id_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `memorial_family_invitations` ADD CONSTRAINT `memorial_family_invitations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
