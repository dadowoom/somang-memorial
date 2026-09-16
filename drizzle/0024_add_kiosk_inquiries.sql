-- 키오스크 문의 (2026-09-16 결정).
-- 관람객이 키오스크에서 자기 전화번호를 남기면 여기에 적고, 추모관 제작 업체 메일로도 보낸다.
-- 메일이 안 나가도 여기 남으므로 관리자 화면(운영)에서 볼 수 있다.
CREATE TABLE IF NOT EXISTS `kiosk_inquiries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `phone` varchar(20) NOT NULL,
  `name` varchar(60) NULL,
  `source` varchar(20) NOT NULL DEFAULT 'kiosk',
  `status` varchar(20) NOT NULL DEFAULT 'new',
  `notifiedAt` timestamp NULL,
  `notifyError` varchar(300) NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `kiosk_inquiries_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE INDEX `kiosk_inquiries_createdAt_idx` ON `kiosk_inquiries` (`createdAt`);
