ALTER TABLE `memorial_letters` MODIFY `memorialId` int;
--> statement-breakpoint
ALTER TABLE `memorial_letters` ADD `recipientName` varchar(120);
--> statement-breakpoint
ALTER TABLE `memorial_letters` ADD `recipientRole` varchar(80);
--> statement-breakpoint
UPDATE `memorial_letters`
INNER JOIN `memorials` ON `memorial_letters`.`memorialId` = `memorials`.`id`
SET
  `memorial_letters`.`recipientName` = `memorials`.`name`,
  `memorial_letters`.`recipientRole` = `memorials`.`role`
WHERE `memorial_letters`.`recipientName` IS NULL;
