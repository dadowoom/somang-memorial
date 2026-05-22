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
  `visibility`,
  `status`,
  `timelineJson`,
  `createdAt`,
  `updatedAt`
)
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 96
)
SELECT
  CONCAT('sample-memorial-', LPAD(n, 3, '0')),
  CONCAT(
    ELT(MOD(n - 1, 12) + 1, '김', '이', '박', '최', '정', '윤', '장', '조', '한', '오', '서', '임'),
    ELT(FLOOR((n - 1) / 12) + 1, '은혜', '믿음', '요셉', '마리아', '요한', '사랑', '소망', '평안')
  ),
  ELT(MOD(n - 1, 5) + 1, '권사', '집사', '장로', '원로장로', '안수집사'),
  CAST(1928 + MOD(n * 3, 22) AS CHAR),
  CAST(2021 + MOD(n, 5) AS CHAR),
  '소망교회',
  ELT(MOD(n - 1, 3) + 1, '여호와는 나의 목자시니 내게 부족함이 없으리로다', '내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고 믿음을 지켰으니', '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라'),
  ELT(MOD(n - 1, 3) + 1, '시편 23:1', '디모데후서 4:7', '데살로니가전서 5:16-18'),
  '소망교회 공동체와 함께 믿음의 길을 걸었습니다.',
  'auto',
  '가족과 교회 공동체가 함께 기억하기 위해 준비된 샘플 추모관입니다. 고인의 삶과 신앙은 예배와 섬김의 자리에서 조용히 이어졌고, 남겨진 마음 속에 감사와 소망으로 기억됩니다.',
  'auto',
  NULL,
  NULL,
  'public',
  'published',
  '[]',
  TIMESTAMP('2026-01-01 00:00:00') + INTERVAL n SECOND,
  TIMESTAMP('2026-01-01 00:00:00') + INTERVAL n SECOND
FROM seq
WHERE NOT EXISTS (
  SELECT 1
  FROM `memorials` existing
  WHERE existing.`slug` = CONCAT('sample-memorial-', LPAD(n, 3, '0'))
);
