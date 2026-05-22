INSERT INTO `memorial_family_rooms` (`memorialId`, `passwordHash`, `title`, `intro`)
SELECT
  `id`,
  SHA2(CONCAT('somang-family:', '1234'), 256),
  '김소망 권사님 가족관',
  '가족들이 서로에게만 남기고 싶은 기억과 안부, 조용한 고백을 모아두는 공간입니다. 공개 추모관에 담기 어려운 개인적인 마음은 이곳에서 천천히 이어갈 수 있습니다.'
FROM `memorials`
WHERE `slug` = 'kim-somang-kwonsa'
  AND NOT EXISTS (
    SELECT 1
    FROM `memorial_family_rooms`
    WHERE `memorial_family_rooms`.`memorialId` = `memorials`.`id`
  );
