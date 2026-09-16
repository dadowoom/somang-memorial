-- 2026-09-16: 예시 추모관 "김소망 권사"에 옛날 사진 4장을 더한다 (사용자가 이미지 AI 로 만든 예시 사진).
-- 1941 어머니와 마을 예배당 앞, 1956 혼례, 1973 시골집 마당에서 네 남매와, 1975 시장 반찬 가게.
-- 앨범이 어릴 적부터 시간 순서로 보이도록 예시 사진(photoKey 가 sample/kim-somang/ 으로 시작)의 순서만 다시
-- 매긴다. 가족이 직접 올린 사진은 건드리지 않는다. 책에서 사진이 없던 쪽에만 사진을 붙인다.
UPDATE `memorial_gallery_photos` g
JOIN `memorials` m ON m.`id` = g.`memorialId`
SET g.`sortOrder` = CASE g.`photoKey`
  WHEN 'sample/kim-somang/2018-birthday' THEN 5
  WHEN 'sample/kim-somang/2019-album' THEN 6
  WHEN 'sample/kim-somang/2021-garden' THEN 7
  WHEN 'sample/kim-somang/2023-interview' THEN 8
  WHEN 'sample/kim-somang/2025-spring' THEN 9
  ELSE g.`sortOrder`
END
WHERE m.`slug` = 'kim-somang-kwonsa'
  AND g.`photoKey` IN ('sample/kim-somang/2018-birthday', 'sample/kim-somang/2019-album', 'sample/kim-somang/2021-garden', 'sample/kim-somang/2023-interview', 'sample/kim-somang/2025-spring');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/1941-with-mother.jpg', 'sample/kim-somang/1941-with-mother', '여덟 살, 어머니와 마을 예배당 앞에서', '1941', 1, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/1941-with-mother');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/1956-wedding.jpg', 'sample/kim-somang/1956-wedding', '스물셋, 혼례를 올리던 날', '1956', 2, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/1956-wedding');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/1973-four-children.jpg', 'sample/kim-somang/1973-four-children', '시골집 마당에서 네 남매와', '1973', 3, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/1973-four-children');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/1975-market.jpg', 'sample/kim-somang/1975-market', '서울 시장 골목, 반찬 가게에서', '1975', 4, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/1975-market');
--> statement-breakpoint
UPDATE `memorial_book_pages` p
JOIN `memorial_books` b ON b.`id` = p.`bookId`
JOIN `memorials` m ON m.`id` = b.`memorialId`
SET p.`photoUrl` = '/sample/kim-somang/1941-with-mother.jpg', p.`photoKey` = 'sample/kim-somang/1941-with-mother'
WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정' AND p.`title` = '어머니의 손을 잡고 간 첫 예배' AND p.`photoUrl` IS NULL;
--> statement-breakpoint
UPDATE `memorial_book_pages` p
JOIN `memorial_books` b ON b.`id` = p.`bookId`
JOIN `memorials` m ON m.`id` = b.`memorialId`
SET p.`photoUrl` = '/sample/kim-somang/1956-wedding.jpg', p.`photoKey` = 'sample/kim-somang/1956-wedding'
WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정' AND p.`title` = '스물셋의 혼례' AND p.`photoUrl` IS NULL;
--> statement-breakpoint
UPDATE `memorial_book_pages` p
JOIN `memorial_books` b ON b.`id` = p.`bookId`
JOIN `memorials` m ON m.`id` = b.`memorialId`
SET p.`photoUrl` = '/sample/kim-somang/1973-four-children.jpg', p.`photoKey` = 'sample/kim-somang/1973-four-children'
WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정' AND p.`title` = '네 남매의 어머니' AND p.`photoUrl` IS NULL;
--> statement-breakpoint
UPDATE `memorial_book_pages` p
JOIN `memorial_books` b ON b.`id` = p.`bookId`
JOIN `memorials` m ON m.`id` = b.`memorialId`
SET p.`photoUrl` = '/sample/kim-somang/1975-market.jpg', p.`photoKey` = 'sample/kim-somang/1975-market'
WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정' AND p.`title` = '시장 골목의 새벽' AND p.`photoUrl` IS NULL;
--> statement-breakpoint
INSERT INTO `memorial_family_room_photos` (`familyRoomId`, `photoUrl`, `photoKey`, `caption`, `sortOrder`)
SELECT r.`id`, '/sample/kim-somang/1956-wedding.jpg', 'sample/kim-somang/family-1956-wedding', '할아버지 할머니 혼례 날 (1956)', -2
FROM `memorial_family_rooms` r JOIN `memorials` m ON m.`id` = r.`memorialId`
WHERE m.`slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_family_room_photos` p WHERE p.`photoKey` = 'sample/kim-somang/family-1956-wedding');
--> statement-breakpoint
INSERT INTO `memorial_family_room_photos` (`familyRoomId`, `photoUrl`, `photoKey`, `caption`, `sortOrder`)
SELECT r.`id`, '/sample/kim-somang/1973-four-children.jpg', 'sample/kim-somang/family-1973-four-children', '시골집 마당, 엄마와 우리 네 남매 (1973)', -1
FROM `memorial_family_rooms` r JOIN `memorials` m ON m.`id` = r.`memorialId`
WHERE m.`slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_family_room_photos` p WHERE p.`photoKey` = 'sample/kim-somang/family-1973-four-children');
