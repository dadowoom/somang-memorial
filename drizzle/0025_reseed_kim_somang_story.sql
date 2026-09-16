-- 2026-09-16: 예시 추모관 "김소망 권사"의 자료를 주인공 중심으로 다시 채운다.
--
-- 0004 에서 넣은 예시 사진 3장은 남자 목사님 사진(신학교·임직·손자녀)이었고,
-- 책은 네 추모관이 똑같이 쓰는 일반 문구 3쪽뿐이었다. 현장 요청("김소망 할머니와
-- 상관없는 게 너무 많다. 어릴 적부터 주인공 중심으로")에 따라 소개글·연표·앨범·
-- 책을 한 사람의 생애로 다시 쓴다. 사진은 저장소 안 client/public/sample/kim-somang/
-- 에 둔 같은 할머니 사진 6장을 쓴다. 가족이 직접 올린 사진(photoKey 가 seed/ 로
-- 시작하지 않는 것)은 건드리지 않는다.
UPDATE `memorials`
SET
  `summary` = '1933년 봄에 태어나 전쟁과 가난의 시절을 지나며 네 남매를 기도로 키우셨습니다. 쉰셋에 소망교회에 등록해 40년을 새벽기도와 주방 봉사로 섬기셨고, 2026년 5월 22일 아흔셋의 나이로 주님의 품에 안기셨습니다.',
  `story` = '김소망 권사님은 1933년 4월, 남쪽 바닷가의 작은 마을에서 4남매 중 둘째 딸로 태어나셨습니다. 여덟 살 되던 해 어머니의 손을 잡고 마을 예배당에 처음 들어갔고, 그날 배운 찬송을 아흔이 넘어서도 잊지 않고 부르셨습니다.\n\n열일곱에 전쟁을 만나 어린 동생들을 업고 피난길을 걸었고, 스물셋에 혼인해 두 아들과 두 딸을 낳으셨습니다. 1975년 온 가족이 서울로 올라온 뒤에는 시장 골목에서 반찬 가게를 하며 자녀들을 가르치셨습니다. 새벽 네 시에 일어나 가게 문을 열기 전 먼저 기도 자리에 앉는 것이 평생의 습관이었습니다.\n\n1986년, 쉰셋에 소망교회에 등록하신 뒤로는 한 주도 예배 자리를 비우지 않으셨습니다. 1994년 권사 임직을 받고 주방 봉사와 새가족 심방을 맡아 이름 없이 섬기셨고, 2009년 남편을 먼저 보낸 뒤에도 "아직 내 할 일이 남았다"며 새벽기도를 이어가셨습니다.\n\n손자녀에게 옛 앨범을 펼쳐 이야기를 들려주는 시간을 가장 좋아하셨고, 아흔 살 생신을 앞두고 가족이 남긴 인터뷰에서 "다 은혜였다"는 말을 가장 많이 하셨습니다. 2026년 5월 22일, 가족이 부르는 찬송 가운데 평안히 주님의 품에 안기셨습니다.',
  `timelineJson` = '[{"year":"1933","title":"출생","description":"4월, 남쪽 바닷가의 작은 마을에서 4남매 중 둘째 딸로 태어나셨습니다."},{"year":"1941","title":"첫 예배","description":"여덟 살, 어머니의 손을 잡고 마을 예배당에 처음 들어가 찬송을 배웠습니다."},{"year":"1950","title":"피난길","description":"열일곱, 어린 동생들을 업고 피난길을 걸으며 기도로 하루하루를 견뎠습니다."},{"year":"1956","title":"결혼","description":"스물셋에 혼인해 가정을 이루셨습니다."},{"year":"1958-1970","title":"네 남매의 어머니","description":"두 아들과 두 딸을 낳아 기도로 키우셨습니다."},{"year":"1975","title":"서울로","description":"온 가족이 서울로 올라와 시장 골목에서 반찬 가게를 시작하셨습니다."},{"year":"1986","title":"소망교회 등록","description":"쉰셋, 소망교회에 등록해 40년 신앙생활의 첫걸음을 내디디셨습니다."},{"year":"1994","title":"권사 임직","description":"권사 임직을 받고 주방 봉사와 새가족 심방을 맡으셨습니다."},{"year":"2009","title":"남편을 먼저 보내고","description":"남편을 먼저 떠나보낸 뒤에도 새벽기도 자리를 지키셨습니다."},{"year":"2023","title":"아흔 번째 생신","description":"가족이 권사님의 이야기를 영상으로 기록했습니다."},{"year":"2026","title":"주님의 품으로","description":"5월 22일, 아흔셋의 나이로 평안히 하나님의 품에 안기셨습니다."}]'
WHERE `slug` = 'kim-somang-kwonsa';
--> statement-breakpoint
DELETE FROM `memorial_gallery_photos`
WHERE `photoKey` LIKE 'seed/kim-somang/%'
  AND `memorialId` IN (SELECT `id` FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/profile.jpg', 'sample/kim-somang/profile', '김소망 권사', '2025', 0, 1
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/profile');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/2018-birthday.jpg', 'sample/kim-somang/2018-birthday', '여든다섯 생신, 막내아들 가족과 함께', '2018', 1, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/2018-birthday');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/2019-album.jpg', 'sample/kim-somang/2019-album', '손자녀에게 옛 앨범을 펼쳐 보이던 날', '2019', 2, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/2019-album');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/2021-garden.jpg', 'sample/kim-somang/2021-garden', '봄날 뜰에서, 막내아들 가족과', '2021', 3, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/2021-garden');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/2023-interview.jpg', 'sample/kim-somang/2023-interview', '아흔 살 생신을 앞두고 가족이 남긴 인터뷰', '2023', 4, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/2023-interview');
--> statement-breakpoint
INSERT INTO `memorial_gallery_photos` (`memorialId`, `photoUrl`, `photoKey`, `caption`, `year`, `sortOrder`, `isRepresentative`)
SELECT `id`, '/sample/kim-somang/2025-spring.jpg', 'sample/kim-somang/2025-spring', '마지막 봄, 거실에서', '2025', 5, 0
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_gallery_photos` WHERE `photoKey` = 'sample/kim-somang/2025-spring');
--> statement-breakpoint
UPDATE `memorial_books` b
JOIN `memorials` m ON m.`id` = b.`memorialId`
SET
  b.`subtitle` = '김소망 권사 1933–2026 · 가족이 기록한 아흔세 해의 이야기',
  b.`coverPhotoUrl` = '/sample/kim-somang/profile.jpg',
  b.`coverPhotoKey` = 'sample/kim-somang/profile',
  b.`publishedYear` = '2026'
WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정';
--> statement-breakpoint
DELETE p FROM `memorial_book_pages` p
JOIN `memorial_books` b ON b.`id` = p.`bookId`
JOIN `memorials` m ON m.`id` = b.`memorialId`
WHERE m.`slug` = 'kim-somang-kwonsa' AND p.`photoKey` LIKE 'seed/kim-somang/%';
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '봄에 태어난 둘째 딸', '1933년 4월, 남쪽 바닷가의 작은 마을에서 4남매 중 둘째 딸로 태어났습니다. 아버지는 바다에 나가고 어머니는 밭을 일구던 집이었습니다. 어머니는 아이의 이름을 "소망"이라 지으며 "어떤 날에도 소망을 잃지 말라"고 기도했습니다. 그 이름은 아흔세 해 동안 그대로 이루어졌습니다.', NULL, NULL, 1933, 4, NULL, 0
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '봄에 태어난 둘째 딸');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '어머니의 손을 잡고 간 첫 예배', '여덟 살 봄, 어머니의 손을 잡고 마을 예배당 문턱을 처음 넘었습니다. 마룻바닥에 앉아 배운 찬송 한 곡을 집으로 오는 길 내내 불렀고, 그 찬송은 권사님이 아흔이 넘어서도 가장 먼저 꺼내 부르는 노래가 되었습니다. 어머니는 밤마다 딸의 머리맡에서 짧게 기도해 주었습니다.', NULL, NULL, 1941, NULL, NULL, 1
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '어머니의 손을 잡고 간 첫 예배');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '피난길에서 배운 기도', '열일곱 살에 전쟁이 났습니다. 어린 동생들을 업고 걷던 피난길에서, 권사님은 무서울 때마다 어머니가 가르쳐 준 대로 눈을 감고 짧게 기도했습니다. "그때 하나님이 우리 식구를 다 살려 두셨다"는 말은 훗날 자녀들이 가장 많이 들은 이야기가 되었습니다.', NULL, NULL, 1950, NULL, NULL, 2
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '피난길에서 배운 기도');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '스물셋의 혼례', '스물셋 되던 해 봄, 이웃 마을의 성실한 청년과 혼인했습니다. 혼수라고는 이불 한 채와 어머니가 챙겨 준 낡은 찬송가 한 권이 전부였지만, 두 사람은 첫날 밤 함께 기도하며 새 가정을 시작했습니다.', NULL, NULL, 1956, NULL, NULL, 3
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '스물셋의 혼례');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '네 남매의 어머니', '1958년부터 1970년까지 두 아들과 두 딸을 낳았습니다. 넉넉하지 않은 살림에도 아이들이 잠들면 등잔 밑에서 이름을 하나씩 부르며 기도했습니다. 막내아들이 태어난 1970년, 권사님은 서른일곱이었습니다.', NULL, NULL, 1958, NULL, NULL, 4
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '네 남매의 어머니');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '시장 골목의 새벽', '온 가족이 서울로 올라온 뒤 시장 골목 한편에서 반찬 가게를 열었습니다. 새벽 네 시에 일어나 가게 문을 열기 전 먼저 기도 자리에 앉는 것이 그날부터 평생의 습관이 되었습니다. 단골들은 "소망이네 집 반찬은 기도로 간을 맞춘다"고 웃으며 말했습니다.', NULL, NULL, 1975, NULL, NULL, 5
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '시장 골목의 새벽');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '소망교회에 첫발을 딛다', '쉰셋 되던 해, 이웃의 권유로 소망교회 주일 예배에 처음 나왔습니다. 그날 이후 40년 동안 한 주도 예배 자리를 비우지 않았습니다. 늘 같은 자리, 앞에서 세 번째 줄 통로 쪽이 권사님의 자리였습니다.', NULL, NULL, 1986, NULL, NULL, 6
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '소망교회에 첫발을 딛다');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '권사 임직, 이름 없는 섬김', '예순하나에 권사 임직을 받았습니다. 주방 봉사와 새가족 심방을 맡아 이름이 드러나지 않는 자리를 골라 섬겼고, 새로 온 성도가 있으면 반찬 한 통을 들고 먼저 찾아갔습니다. 교회 주방의 큰 솥은 권사님의 손에 가장 익숙했습니다.', NULL, NULL, 1994, NULL, NULL, 7
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '권사 임직, 이름 없는 섬김');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '남편을 먼저 보내고', '쉰세 해를 함께 산 남편을 먼저 하늘로 보냈습니다. 슬픔 가운데서도 "아직 내 할 일이 남았다"며 새벽기도 자리를 지켰고, 그해 겨울부터는 홀로 된 이웃 어르신들을 주일마다 교회로 모시고 왔습니다.', NULL, NULL, 2009, NULL, NULL, 8
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '남편을 먼저 보내고');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '생신상 앞에서', '여든다섯 생신, 막내아들 가족이 차린 생신상 앞에서 손자녀의 박수를 받으며 촛불을 껐습니다. 소원을 묻는 손녀에게 권사님은 "너희가 예수님 잘 믿는 것"이라고 답했습니다.', '/sample/kim-somang/2018-birthday.jpg', 'sample/kim-somang/2018-birthday', 2018, NULL, NULL, 9
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '생신상 앞에서');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '손자녀에게 들려준 옛이야기', '주말이면 손자녀를 무릎 곁에 앉히고 낡은 앨범을 펼쳤습니다. 피난길 이야기, 시장 골목 이야기, 처음 교회에 가던 날 이야기가 앨범 한 장마다 이어졌습니다. 손자는 그 이야기를 학교 글짓기에 써서 상을 받았습니다.', '/sample/kim-somang/2019-album.jpg', 'sample/kim-somang/2019-album', 2019, NULL, NULL, 10
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '손자녀에게 들려준 옛이야기');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '뜰에서의 봄날', '봄볕 좋은 날, 막내아들 부부와 손자녀가 뜰에 모여 사진을 찍었습니다. 권사님은 사진 한 장을 찍을 때마다 "이것도 다 은혜다"라고 말했습니다. 이 사진은 거실 가장 잘 보이는 자리에 걸렸습니다.', '/sample/kim-somang/2021-garden.jpg', 'sample/kim-somang/2021-garden', 2021, NULL, NULL, 11
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '뜰에서의 봄날');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '아흔, 가족이 기록한 목소리', '아흔 번째 생신을 앞두고 가족이 권사님의 이야기를 영상으로 기록했습니다. 어릴 적 예배당 이야기부터 시장 골목의 새벽까지 두 시간 넘게 이어진 인터뷰에서 가장 많이 나온 말은 "다 은혜였다"였습니다.', '/sample/kim-somang/2023-interview.jpg', 'sample/kim-somang/2023-interview', 2023, NULL, NULL, 12
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '아흔, 가족이 기록한 목소리');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '마지막 봄', '거동이 불편해진 뒤에도 주일 아침이면 옷을 갖춰 입고 거실에서 예배 영상을 함께 보았습니다. 가족이 찍은 이 사진은 권사님이 가장 마음에 들어 한 사진이 되었습니다. "웃는 얼굴로 기억해 달라"는 부탁과 함께.', '/sample/kim-somang/2025-spring.jpg', 'sample/kim-somang/2025-spring', 2025, NULL, NULL, 13
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '마지막 봄');
--> statement-breakpoint
INSERT INTO `memorial_book_pages` (`bookId`, `title`, `content`, `photoUrl`, `photoKey`, `dateYear`, `dateMonth`, `dateDay`, `sortOrder`)
SELECT t.`id`, '주님의 품으로', '2026년 5월 22일 새벽, 가족이 부르는 찬송 가운데 평안히 주님의 품에 안기셨습니다. 아흔세 해의 여정은 어릴 적 어머니가 지어 준 이름 그대로, 소망으로 시작해 소망으로 끝났습니다. "내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고 믿음을 지켰으니." (디모데후서 4:7)', NULL, NULL, 2026, 5, 22, 14
FROM (SELECT MIN(b.`id`) AS `id` FROM `memorial_books` b JOIN `memorials` m ON m.`id` = b.`memorialId` WHERE m.`slug` = 'kim-somang-kwonsa' AND b.`title` = '신앙의 여정') t
WHERE t.`id` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `memorial_book_pages` p WHERE p.`bookId` = t.`id` AND p.`title` = '주님의 품으로');
--> statement-breakpoint
UPDATE `memorials`
SET
  `birthDate` = '1933-04-12',
  `deathDate` = '2026-05-22',
  `servicePlace` = '소망교회 본당',
  `serviceTime` = '2026년 5월 24일(주일) 오후 2시'
WHERE `slug` = 'kim-somang-kwonsa' AND `birthDate` = '1933' AND `deathDate` = '2026';
--> statement-breakpoint
UPDATE `memorial_letters` l
JOIN `memorials` m ON m.`id` = l.`memorialId`
SET l.`status` = 'hidden'
WHERE m.`slug` = 'kim-somang-kwonsa' AND l.`content` LIKE '편지 단추 점검용%';
--> statement-breakpoint
INSERT INTO `memorial_letters` (`memorialId`, `author`, `content`, `status`, `createdAt`)
SELECT `id`, '큰딸', '엄마, 새벽마다 부엌에서 들리던 기도 소리가 아직도 귀에 남아 있어요. 엄마가 늘 하시던 말씀대로 소망 잃지 않고 살게요. 천국에서 아버지 만나 편히 쉬세요.', 'published', '2026-05-23 09:10:00'
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_letters` l WHERE l.`memorialId` = `memorials`.`id` AND l.`author` = '큰딸');
--> statement-breakpoint
INSERT INTO `memorial_letters` (`memorialId`, `author`, `content`, `status`, `createdAt`)
SELECT `id`, '막내아들 가족', '어머니, 생신상 앞에서 촛불 끄시던 모습이 엊그제 같습니다. 아이들이 할머니 이야기를 매일 합니다. 가르쳐 주신 대로 주일마다 예배 자리 지키겠습니다.', 'published', '2026-05-24 20:30:00'
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_letters` l WHERE l.`memorialId` = `memorials`.`id` AND l.`author` = '막내아들 가족');
--> statement-breakpoint
INSERT INTO `memorial_letters` (`memorialId`, `author`, `content`, `status`, `createdAt`)
SELECT `id`, '손녀 하은', '할머니, 앨범 보면서 들려주신 피난길 이야기 다 기억하고 있어요. 할머니가 부르시던 찬송, 제가 이어서 부를게요. 사랑해요.', 'published', '2026-05-25 18:05:00'
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_letters` l WHERE l.`memorialId` = `memorials`.`id` AND l.`author` = '손녀 하은');
--> statement-breakpoint
INSERT INTO `memorial_letters` (`memorialId`, `author`, `content`, `status`, `createdAt`)
SELECT `id`, '소망교회 2여전도회', '권사님이 주방에서 큰 솥을 저으시던 손길을 기억합니다. 새가족을 먼저 찾아가 반찬을 건네시던 그 마음을 저희가 이어가겠습니다.', 'published', '2026-05-26 11:40:00'
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_letters` l WHERE l.`memorialId` = `memorials`.`id` AND l.`author` = '소망교회 2여전도회');
--> statement-breakpoint
INSERT INTO `memorial_letters` (`memorialId`, `author`, `content`, `status`, `createdAt`)
SELECT `id`, '담임목사', '권사님, 앞에서 세 번째 줄 통로 쪽 자리가 비어 있습니다. 40년 동안 한 자리에서 드리신 예배가 우리 교회의 기둥이었습니다. 주님 품에서 안식하소서.', 'published', '2026-05-28 08:00:00'
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_letters` l WHERE l.`memorialId` = `memorials`.`id` AND l.`author` = '담임목사');
--> statement-breakpoint
INSERT INTO `memorial_letters` (`memorialId`, `author`, `content`, `status`, `createdAt`)
SELECT `id`, '시장 골목 옛 이웃', '소망이네 반찬집 아주머니, 새벽마다 먼저 기도하고 가게 문 여시던 모습이 눈에 선합니다. 좋은 곳에서 평안하십시오.', 'published', '2026-06-01 15:20:00'
FROM `memorials` WHERE `slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_letters` l WHERE l.`memorialId` = `memorials`.`id` AND l.`author` = '시장 골목 옛 이웃');
--> statement-breakpoint
INSERT INTO `memorial_family_room_photos` (`familyRoomId`, `photoUrl`, `photoKey`, `caption`, `sortOrder`)
SELECT r.`id`, '/sample/kim-somang/2019-album.jpg', 'sample/kim-somang/family-2019-album', '할머니 무릎 옆에서 앨범 보던 주말', 0
FROM `memorial_family_rooms` r JOIN `memorials` m ON m.`id` = r.`memorialId`
WHERE m.`slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_family_room_photos` p WHERE p.`photoKey` = 'sample/kim-somang/family-2019-album');
--> statement-breakpoint
INSERT INTO `memorial_family_room_photos` (`familyRoomId`, `photoUrl`, `photoKey`, `caption`, `sortOrder`)
SELECT r.`id`, '/sample/kim-somang/2018-birthday.jpg', 'sample/kim-somang/family-2018-birthday', '여든다섯 생신, 우리끼리 찍은 사진', 1
FROM `memorial_family_rooms` r JOIN `memorials` m ON m.`id` = r.`memorialId`
WHERE m.`slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_family_room_photos` p WHERE p.`photoKey` = 'sample/kim-somang/family-2018-birthday');
--> statement-breakpoint
INSERT INTO `memorial_family_room_photos` (`familyRoomId`, `photoUrl`, `photoKey`, `caption`, `sortOrder`)
SELECT r.`id`, '/sample/kim-somang/2021-garden.jpg', 'sample/kim-somang/family-2021-garden', '뜰에서 온 가족이 함께한 봄날', 2
FROM `memorial_family_rooms` r JOIN `memorials` m ON m.`id` = r.`memorialId`
WHERE m.`slug` = 'kim-somang-kwonsa' AND NOT EXISTS (SELECT 1 FROM `memorial_family_room_photos` p WHERE p.`photoKey` = 'sample/kim-somang/family-2021-garden');
