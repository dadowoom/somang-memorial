-- 0016·0017 이 목록(_journal.json)에 등록되지 않아, 빈 데이터베이스에 설치하면
-- "성공"이라고 나오면서 표 두 개가 만들어지지 않았다. 없는 표는 부모찾기와
-- 키오스크가 쓰는 표라, 새로 세운 서버는 그 기능이 죽은 채로 뜬다.
--
-- 0016·0017 을 목록에 넣는 방법도 있지만, 그러면 표가 이미 있는 운영
-- 데이터베이스에서 "이미 존재합니다"로 배포가 멈춘다. 사람이 순서를 지켜야
-- 하는 방식은 언젠가 틀린다.
--
-- 그래서 이 단계는 있으면 넘어가고 없으면 만든다. 빈 데이터베이스든 이미
-- 운영 중인 데이터베이스든 그냥 돌리면 된다. 여러 번 돌려도 안전하다.
--
-- MySQL 은 CREATE INDEX 나 ADD COLUMN 에 IF NOT EXISTS 를 지원하지 않으므로,
-- information_schema 로 확인한 뒤 필요한 문장만 만들어 실행한다.

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
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
CREATE TABLE IF NOT EXISTS `somang_interment_records` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sourceId` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `nameNormalized` varchar(120) NOT NULL,
  `role` varchar(80),
  `affiliation` varchar(255),
  `pastor` varchar(120),
  `funeralChurch` varchar(160),
  `birthDate` varchar(20) NOT NULL,
  `deathDate` varchar(20) NOT NULL,
  `deathAge` varchar(20),
  `burialPlace` varchar(255) NOT NULL,
  `burialDate` varchar(20),
  `sourcePayload` text NOT NULL,
  `importedAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `somang_interment_records_id` PRIMARY KEY (`id`),
  CONSTRAINT `somang_interment_records_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'admin_audit_logs'
      AND index_name = 'admin_audit_logs_adminUserId_idx') = 0,
  'CREATE INDEX `admin_audit_logs_adminUserId_idx` ON `admin_audit_logs` (`adminUserId`)',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'admin_audit_logs'
      AND index_name = 'admin_audit_logs_targetUserId_idx') = 0,
  'CREATE INDEX `admin_audit_logs_targetUserId_idx` ON `admin_audit_logs` (`targetUserId`)',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'admin_audit_logs'
      AND index_name = 'admin_audit_logs_createdAt_idx') = 0,
  'CREATE INDEX `admin_audit_logs_createdAt_idx` ON `admin_audit_logs` (`createdAt`)',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'somang_interment_records'
      AND index_name = 'somang_interment_records_name_birth_idx') = 0,
  'CREATE INDEX `somang_interment_records_name_birth_idx` ON `somang_interment_records` (`nameNormalized`,`birthDate`)',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE table_schema = DATABASE() AND table_name = 'memorials'
      AND column_name = 'intermentRecordId') = 0,
  'ALTER TABLE `memorials` ADD COLUMN `intermentRecordId` int NULL AFTER `createdByUserId`',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = 'memorials'
      AND index_name = 'memorials_intermentRecordId_unique') = 0,
  'CREATE UNIQUE INDEX `memorials_intermentRecordId_unique` ON `memorials` (`intermentRecordId`)',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE constraint_schema = DATABASE() AND table_name = 'admin_audit_logs'
      AND constraint_name = 'admin_audit_logs_adminUserId_users_id_fk') = 0,
  'ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE constraint_schema = DATABASE() AND table_name = 'admin_audit_logs'
      AND constraint_name = 'admin_audit_logs_targetUserId_users_id_fk') = 0,
  'ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE constraint_schema = DATABASE() AND table_name = 'memorials'
      AND constraint_name = 'memorials_intermentRecordId_somang_interment_records_id_fk') = 0,
  'ALTER TABLE `memorials` ADD CONSTRAINT `memorials_intermentRecordId_somang_interment_records_id_fk` FOREIGN KEY (`intermentRecordId`) REFERENCES `somang_interment_records`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
  'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
