INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_man-EoYUBTXnk59Sfrj2gmtSED.webp', 'seed/kim-youngsu/portrait', '김영수 장로', '2024', 0, 1
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/portrait');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1960-birth-h3oawzwRRgs9V5LuTAXFmK.webp', 'seed/kim-youngsu/1950-childhood', '유년 시절', '1950', 1, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/1950-childhood');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1979-seminary-SRrr4X9aV8sR6KSNgfqcuD.webp', 'seed/kim-youngsu/1963-youth', '청년부 시절', '1963', 2, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/1963-youth');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1985-wedding-bjQWo7kDiwRR99t7uMFuSk.webp', 'seed/kim-youngsu/1968-wedding', '결혼 예식', '1968', 3, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/1968-wedding');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1983-ordination-7aDktJ8bQBcauNbvL6fLgC.webp', 'seed/kim-youngsu/1978-ordination', '집사 임직', '1978', 4, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/1978-ordination');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1990-revival-eV4ToKxSgwRVmKoKVUwWEW.webp', 'seed/kim-youngsu/1990-elder', '장로 장립', '1990', 5, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/1990-elder');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2000-new-church-TeB5MqSnZwtXjD7VqAtHHe.webp', 'seed/kim-youngsu/1998-church-building', '성전 건축 봉사', '1998', 6, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/1998-church-building');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2006-anniversary-X7CHuM4mt4dNvsoURDPXXU.webp', 'seed/kim-youngsu/2005-emeritus', '원로장로 추대', '2005', 7, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/2005-emeritus');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2022-grandchildren-5N63ftfLe4iHY27LkwfFtd.webp', 'seed/kim-youngsu/2015-grandchildren', '손자녀 세례', '2015', 8, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/2015-grandchildren');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2024-retirement-gbCPQXseZhCxafxEWABAri.webp', 'seed/kim-youngsu/2024-final-worship', '마지막 가정 예배', '2024', 9, 0
FROM `memorials` WHERE `slug` = 'kim-youngsu-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-youngsu/2024-final-worship');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_woman-VLyrQ8BXGGoAo339g3C8yL.webp', 'seed/lee-soonja/portrait', '이순자 권사', '2024', 0, 1
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/portrait');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1979-seminary-SRrr4X9aV8sR6KSNgfqcuD.webp', 'seed/lee-soonja/1963-first-worship', '소망교회 첫 출석', '1963', 1, 0
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/1963-first-worship');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1985-wedding-bjQWo7kDiwRR99t7uMFuSk.webp', 'seed/lee-soonja/1968-wedding', '결혼 기념', '1968', 2, 0
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/1968-wedding');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1983-ordination-7aDktJ8bQBcauNbvL6fLgC.webp', 'seed/lee-soonja/1975-ordination', '권사 임직', '1975', 3, 0
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/1975-ordination');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1993-dawn-prayer-eK7i2MRtWH5NsXc7oYEiZ9.webp', 'seed/lee-soonja/1985-prayer', '새벽기도 10년 개근', '1985', 4, 0
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/1985-prayer');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2010-welfare-cUapyexhDGsdkaF2HXaDzo.webp', 'seed/lee-soonja/2000-service', '교회 봉사', '2000', 5, 0
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/2000-service');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2022-grandchildren-5N63ftfLe4iHY27LkwfFtd.webp', 'seed/lee-soonja/2005-grandchildren', '손자녀와 함께', '2005', 6, 0
FROM `memorials` WHERE `slug` = 'lee-soonja-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/lee-soonja/2005-grandchildren');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=1000&fit=crop&auto=format&q=80', 'seed/kim-yohan/portrait', '김요한 장로', '2024', 0, 1
FROM `memorials` WHERE `slug` = 'kim-yohan-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-yohan/portrait');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=900&h=650&fit=crop&auto=format&q=80', 'seed/kim-yohan/2018-family', '가족과 함께', '2018', 1, 0
FROM `memorials` WHERE `slug` = 'kim-yohan-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-yohan/2018-family');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&h=650&fit=crop&auto=format&q=80', 'seed/kim-yohan/2017-church', '교회 창립 40주년 기념', '2017', 2, 0
FROM `memorials` WHERE `slug` = 'kim-yohan-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-yohan/2017-church');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&h=650&fit=crop&auto=format&q=80', 'seed/kim-yohan/2018-anniversary', '결혼 50주년', '2018', 3, 0
FROM `memorials` WHERE `slug` = 'kim-yohan-elder' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-yohan/2018-anniversary');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_woman-VLyrQ8BXGGoAo339g3C8yL.webp', 'seed/kim-somang/portrait', '김소망 권사', '2026', 0, 1
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-somang/portrait');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1979-seminary-SRrr4X9aV8sR6KSNgfqcuD.webp', 'seed/kim-somang/1986-first-worship', '소망교회 첫 출석', '1986', 1, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-somang/1986-first-worship');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-1983-ordination-7aDktJ8bQBcauNbvL6fLgC.webp', 'seed/kim-somang/1994-ordination', '권사 임직', '1994', 2, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-somang/1994-ordination');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, 'https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/LbiqkwDAoVEVoVeykeSW5m/pastor-2022-grandchildren-5N63ftfLe4iHY27LkwfFtd.webp', 'seed/kim-somang/2018-family', '가족과 함께', '2018', 3, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'seed/kim-somang/2018-family');
--> statement-breakpoint
INSERT INTO `memorial_videos` (`memorialId`, `title`, `description`, `youtubeVideoId`, `isVisible`, `sortOrder`)
SELECT `id`, '소망의 길을 기억하며', '가족이 함께 보는 추모 영상입니다.', 'Ehp3DZxB9G4', 1, 0
FROM `memorials` WHERE `slug` IN ('kim-youngsu-elder', 'kim-yohan-elder', 'lee-soonja-kwonsa', 'kim-somang-kwonsa') AND NOT EXISTS (SELECT 1 FROM `memorial_videos` WHERE `memorial_videos`.`memorialId` = `memorials`.`id`);
--> statement-breakpoint
INSERT INTO `memorial_books` (`memorialId`, `title`, `subtitle`, `coverPhotoUrl`, `coverPhotoKey`, `publishedYear`, `sortOrder`)
SELECT `id`, '신앙의 여정', '가족이 기록한 생애와 믿음의 발자취', NULL, NULL, '2026', 0
FROM `memorials` WHERE `slug` IN ('kim-youngsu-elder', 'kim-yohan-elder', 'lee-soonja-kwonsa', 'kim-somang-kwonsa') AND NOT EXISTS (SELECT 1 FROM `memorial_books` WHERE `memorial_books`.`memorialId` = `memorials`.`id`);
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT b.`id`, '소망교회와 만나다', '예배의 자리에서 삶의 중심을 다시 세우고, 교회 공동체와 함께 신앙의 길을 걷기 시작했습니다.', g.`photoUrl`, g.`photoKey`, '1965', NULL, NULL, 0
FROM `memorial_books` b
JOIN `memorials` m ON m.`id` = b.`memorialId`
LEFT JOIN `memorial_gallery_photos` g ON g.`memorialId` = m.`id` AND g.`sortOrder` = 1
WHERE m.`slug` IN ('kim-youngsu-elder', 'kim-yohan-elder', 'lee-soonja-kwonsa', 'kim-somang-kwonsa') AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = b.`id`);
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT b.`id`, '가정과 섬김', '가족을 믿음 안에서 돌보고, 작은 자리에서도 교회와 이웃을 섬기는 삶을 이어갔습니다.', g.`photoUrl`, g.`photoKey`, '1980', NULL, NULL, 1
FROM `memorial_books` b
JOIN `memorials` m ON m.`id` = b.`memorialId`
LEFT JOIN `memorial_gallery_photos` g ON g.`memorialId` = m.`id` AND g.`sortOrder` = 2
WHERE m.`slug` IN ('kim-youngsu-elder', 'kim-yohan-elder', 'lee-soonja-kwonsa', 'kim-somang-kwonsa') AND EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = b.`id` AND p.`sortOrder` = 0) AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = b.`id` AND p.`sortOrder` = 1);
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT b.`id`, '감사로 남은 기억', '마지막까지 감사와 소망을 붙들었던 삶은 가족과 성도들에게 오래 남을 믿음의 유산이 되었습니다.', g.`photoUrl`, g.`photoKey`, '2024', NULL, NULL, 2
FROM `memorial_books` b
JOIN `memorials` m ON m.`id` = b.`memorialId`
LEFT JOIN `memorial_gallery_photos` g ON g.`memorialId` = m.`id` AND g.`sortOrder` = 3
WHERE m.`slug` IN ('kim-youngsu-elder', 'kim-yohan-elder', 'lee-soonja-kwonsa', 'kim-somang-kwonsa') AND EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = b.`id` AND p.`sortOrder` = 1) AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = b.`id` AND p.`sortOrder` = 2);
