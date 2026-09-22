-- 추도일 알림 본인 번호 확인 (2026-09-23).
-- 알림을 신청·해지할 때 그 번호로 카카오 알림톡 인증번호 6자리를 보내고, 맞게 넣어야 처리한다.
-- 번호와 인증번호는 그대로 적지 않고 서버 비밀값으로 만든 해시만 남긴다. 5분이 지나거나
-- 5번 틀리면 못 쓴다. 표 하나를 새로 만들 뿐이고 기존 표는 바꾸지 않는다.
CREATE TABLE IF NOT EXISTS `reminder_phone_verifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `memorialId` int NOT NULL,
  `phoneHash` varchar(64) NOT NULL,
  `purpose` enum('subscribe','cancel') NOT NULL,
  `codeHash` varchar(64) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `reminder_phone_verifications_id` PRIMARY KEY (`id`),
  CONSTRAINT `reminder_phone_verifications_memorialId_fk` FOREIGN KEY (`memorialId`) REFERENCES `memorials` (`id`) ON DELETE CASCADE,
  INDEX `reminder_phone_verifications_lookup_idx` (`phoneHash`, `memorialId`, `purpose`),
  INDEX `reminder_phone_verifications_expiresAt_idx` (`expiresAt`)
);
