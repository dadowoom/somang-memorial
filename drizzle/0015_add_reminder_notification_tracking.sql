ALTER TABLE `memorial_reminder_subscriptions` ADD `lastNotifiedYear` int;
--> statement-breakpoint
ALTER TABLE `memorial_reminder_subscriptions` ADD `lastNotifiedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `memorial_reminder_subscriptions` ADD `lastNotificationMessageId` varchar(120);
--> statement-breakpoint
ALTER TABLE `memorial_reminder_subscriptions` ADD `lastNotificationError` text;
