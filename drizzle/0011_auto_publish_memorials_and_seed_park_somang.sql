ALTER TABLE `memorials` MODIFY `status` enum('pending','published','private') NOT NULL DEFAULT 'published';
--> statement-breakpoint
UPDATE `memorials`
SET `status` = 'published'
WHERE `status` = 'pending';
--> statement-breakpoint
INSERT INTO `memorials` (
  `slug`,
  `name`,
  `role`,
  `birthDate`,
  `deathDate`,
  `church`,
  `verse`,
  `verseRef`,
  `summary`,
  `summaryDisplaySize`,
  `story`,
  `storyDisplaySize`,
  `servicePlace`,
  `serviceTime`,
  `memorialDay`,
  `visibility`,
  `accessPasswordHash`,
  `status`,
  `timelineJson`,
  `createdAt`,
  `updatedAt`
)
SELECT
  'park-somang',
  '박소망',
  '권사',
  '1936',
  '2026',
  '소망교회',
  '내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고 믿음을 지켰으니',
  '디모데후서 4:7',
  '믿음 안에서 가족과 교회를 섬긴 권사님입니다.',
  'auto',
  '박소망 권사님은 긴 세월 예배의 자리를 소중히 지키며 가족과 교회 공동체 안에서 조용하고 성실한 믿음의 길을 걸으셨습니다. 남겨진 가족과 성도들은 권사님의 온유한 기도와 따뜻한 섬김을 감사로 기억합니다.',
  'auto',
  NULL,
  NULL,
  '2026-05-22',
  'private',
  SHA2(CONCAT('somang-memorial-access:', '1234'), 256),
  'published',
  '[{"year":"1936","title":"출생","description":"하나님의 은혜 가운데 삶을 시작했습니다."},{"year":"1986","title":"소망교회와 동행","description":"예배와 기도의 자리에서 신앙의 길을 이어갔습니다."},{"year":"2026","title":"주님의 품으로","description":"가족과 교회의 기억 속에 믿음의 유산을 남겼습니다."}]',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM `memorials`
  WHERE `slug` = 'park-somang'
);
--> statement-breakpoint
UPDATE `memorials`
SET
  `name` = '박소망',
  `role` = '권사',
  `church` = '소망교회',
  `visibility` = 'private',
  `accessPasswordHash` = SHA2(CONCAT('somang-memorial-access:', '1234'), 256),
  `status` = 'published'
WHERE `slug` = 'park-somang';
