-- 입장 비밀번호를 소금 없는 SHA-256(64자)에서 scrypt(168자)로 바꾼다.
-- 기존 칸은 옛 형식에 맞춘 128자라 새 값이 들어가지 않는다.
-- 회원 비밀번호 칸과 같은 255자로 넓힌다.
ALTER TABLE `memorials` MODIFY COLUMN `accessPasswordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `memorial_family_rooms` MODIFY COLUMN `passwordHash` varchar(255) NOT NULL;
