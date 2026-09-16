-- 가족관에 영상과 사진 (2026-09-16 결정).
-- 가족관마다 유튜브 영상 하나(칸 세 개)와 사진 여러 장을 둔다. 사진은 가족관(familyRoomId)에
-- 묶여 있어 다른 가족관에 섞여 나오지 않고, 가족관이 지워지면 같이 지워진다.
-- 사진 파일은 추모관 사진과 같은 업로드 폴더(family-rooms/<가족관번호>/)에 저장하고 여기에는 주소만 남긴다.
ALTER TABLE `memorial_family_rooms` ADD `youtubeVideoId` varchar(11) NULL;
--> statement-breakpoint
ALTER TABLE `memorial_family_rooms` ADD `videoTitle` varchar(160) NULL;
--> statement-breakpoint
ALTER TABLE `memorial_family_rooms` ADD `videoDescription` varchar(500) NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `memorial_family_room_photos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `familyRoomId` int NOT NULL,
  `photoUrl` text NOT NULL,
  `photoKey` varchar(500) NOT NULL,
  `caption` varchar(500) NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memorial_family_room_photos_id` PRIMARY KEY (`id`),
  CONSTRAINT `memorial_family_room_photos_familyRoomId_fk` FOREIGN KEY (`familyRoomId`) REFERENCES `memorial_family_rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `memorial_family_room_photos_familyRoomId_idx` ON `memorial_family_room_photos` (`familyRoomId`);
