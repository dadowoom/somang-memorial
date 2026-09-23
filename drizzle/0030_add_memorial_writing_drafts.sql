-- 추모관 작성 중 자동 저장 (2026-09-23).
-- 로그인한 계정마다 작성 중인 글을 하나씩 서버에 둔다. 기기에 남기지 않아 공용 PC 에 흔적이
-- 없고, 휴대폰에서 쓰다 끊겨도 이어 쓸 수 있다. 입장 비밀번호는 저장하지 않는다.
-- 표 하나를 새로 만들 뿐이고 기존 표는 바꾸지 않는다.
CREATE TABLE IF NOT EXISTS `memorial_writing_drafts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `kind` enum('create') NOT NULL DEFAULT 'create',
  `payload` mediumtext NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memorial_writing_drafts_id` PRIMARY KEY (`id`),
  CONSTRAINT `memorial_writing_drafts_user_kind_unique` UNIQUE (`userId`, `kind`),
  CONSTRAINT `memorial_writing_drafts_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `memorial_writing_drafts_updatedAt_idx` (`updatedAt`)
);
