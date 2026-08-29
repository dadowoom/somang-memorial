ALTER TABLE `memorials` MODIFY COLUMN `accessPasswordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `memorial_family_rooms` MODIFY COLUMN `passwordHash` varchar(255) NOT NULL;
