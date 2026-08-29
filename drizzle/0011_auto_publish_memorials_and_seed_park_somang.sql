ALTER TABLE `memorials` MODIFY `status` enum('pending','published','private') NOT NULL DEFAULT 'published';
--> statement-breakpoint
UPDATE `memorials`
SET `status` = 'published'
WHERE `status` = 'pending';
--> statement-breakpoint
-- The demonstration memorial `park-somang` used to be seeded here, together with a
-- shared access password. It was removed from the production database, and the seed
-- is retired so a rebuilt or restored database does not recreate a fictional person
-- (and does not reintroduce a hard-coded access password). The schema change above
-- is kept because production depends on it.
SELECT 1;
