-- 로그아웃 후 같은 로그인 쿠키를 다시 쓰지 못하도록 서버에 폐기 기록을 둔다.
-- 기존 회원 및 추모관 자료는 변경하거나 삭제하지 않는다.
CREATE TABLE IF NOT EXISTS `revoked_sessions` (
  `sessionKey` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `revoked_sessions_sessionKey` PRIMARY KEY (`sessionKey`)
);
