-- 키오스크 대기(광고) 화면 (2026-09-15 결정).
-- 아무도 만지지 않을 때 교회가 올린 포스터 이미지를 전체 화면으로 돌려 보여 주고,
-- 화면을 터치하면 지금의 검색 화면으로 넘어간다. 순서·한 장을 보여 줄 시간(초)·
-- 사용 여부는 관리자 화면에서 정한다. 사진 파일 자체는 추모관 사진과 같은
-- 업로드 폴더에 저장하고 여기에는 주소만 남긴다.
CREATE TABLE IF NOT EXISTS `kiosk_posters` (
  `id` int AUTO_INCREMENT NOT NULL,
  `imageUrl` text NOT NULL,
  `imageKey` varchar(500) NOT NULL,
  `caption` varchar(200) NULL,
  `displaySeconds` int NOT NULL DEFAULT 8,
  `sortOrder` int NOT NULL DEFAULT 0,
  `isActive` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `kiosk_posters_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE INDEX `kiosk_posters_sortOrder_idx` ON `kiosk_posters` (`sortOrder`);
