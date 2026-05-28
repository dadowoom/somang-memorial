ALTER TABLE `memorials` ADD COLUMN `createdByUserId` int NULL AFTER `familyPhone`;
--> statement-breakpoint
CREATE INDEX `memorials_createdByUserId_idx` ON `memorials` (`createdByUserId`);
--> statement-breakpoint
ALTER TABLE `memorials` ADD CONSTRAINT `memorials_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
