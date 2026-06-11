CREATE TABLE `admin_audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `adminUserId` int,
  `targetUserId` int,
  `action` varchar(80) NOT NULL,
  `beforeValue` varchar(120),
  `afterValue` varchar(120),
  `note` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `admin_audit_logs_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_adminUserId_idx` ON `admin_audit_logs` (`adminUserId`);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_targetUserId_idx` ON `admin_audit_logs` (`targetUserId`);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_createdAt_idx` ON `admin_audit_logs` (`createdAt`);
--> statement-breakpoint
ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
