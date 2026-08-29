-- 이미 표가 만들어져 있는 기존 데이터베이스에서 한 번만 실행합니다.
--
-- 왜 필요한가:
--   0016·0017 단계가 목록(_journal.json)에 빠져 있어, 새로 설치하면 표가 안 만들어졌습니다.
--   목록에 추가하면 새 설치는 정상이 되지만, 표가 이미 있는 운영 데이터베이스에서는
--   "이미 존재합니다" 오류가 납니다. 이 파일은 그 두 단계를 "이미 적용됨"으로 기록해
--   건너뛰게 합니다. 표나 자료는 전혀 건드리지 않습니다.
--
-- 실행 (서버에서 Codex가):
--   mysql -u <사용자> -p <데이터베이스> < scripts/backfill-migration-journal.sql
--
-- 확인: 실행 뒤 `pnpm exec drizzle-kit migrate` 가 오류 없이 끝나야 합니다.
-- 두 번 실행해도 안전합니다(이미 있으면 넣지 않습니다).

-- 0016_add_admin_audit_logs.sql
INSERT INTO `__drizzle_migrations` (`hash`, `created_at`)
SELECT '800b0eb9ca03dea400cf087cee6cd742b2c04d8b8bd1eb6c555b92024dbe3153', 1781151537000
WHERE NOT EXISTS (
  SELECT 1 FROM `__drizzle_migrations` WHERE `hash` = '800b0eb9ca03dea400cf087cee6cd742b2c04d8b8bd1eb6c555b92024dbe3153'
);
-- 0017_add_somang_interment_records.sql
INSERT INTO `__drizzle_migrations` (`hash`, `created_at`)
SELECT '631d78a9aded718c9ec801bc2e7fb138475fa5f4e97c80b41389019fe458ecb5', 1785985004000
WHERE NOT EXISTS (
  SELECT 1 FROM `__drizzle_migrations` WHERE `hash` = '631d78a9aded718c9ec801bc2e7fb138475fa5f4e97c80b41389019fe458ecb5'
);
