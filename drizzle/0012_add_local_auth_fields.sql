ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255) NULL AFTER `email`,
  ADD COLUMN `phone` varchar(30) NULL AFTER `passwordHash`,
  ADD COLUMN `approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER `role`,
  ADD COLUMN `approvedAt` timestamp NULL AFTER `approvalStatus`;
--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);
--> statement-breakpoint
CREATE INDEX `users_approvalStatus_idx` ON `users` (`approvalStatus`);
