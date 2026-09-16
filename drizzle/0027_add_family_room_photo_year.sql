-- 가족관 사진에도 추모관 앨범처럼 연도 칸을 둔다 (2026-09-16 결정: 가족관 앨범을 추모관 앨범과 같은 방식으로).
-- 칸 하나만 늘린다. 이미 올린 사진과 설명은 그대로이고, 연도는 비어 있는 채로 시작한다.
ALTER TABLE `memorial_family_room_photos` ADD `year` varchar(20) NULL;
