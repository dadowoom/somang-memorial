CREATE TABLE `somang_interment_records` (
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
CREATE INDEX `somang_interment_records_name_birth_idx` ON `somang_interment_records` (`nameNormalized`,`birthDate`);
--> statement-breakpoint
ALTER TABLE `memorials` ADD COLUMN `intermentRecordId` int NULL AFTER `createdByUserId`;
--> statement-breakpoint
CREATE UNIQUE INDEX `memorials_intermentRecordId_unique` ON `memorials` (`intermentRecordId`);
--> statement-breakpoint
ALTER TABLE `memorials` ADD CONSTRAINT `memorials_intermentRecordId_somang_interment_records_id_fk` FOREIGN KEY (`intermentRecordId`) REFERENCES `somang_interment_records`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
