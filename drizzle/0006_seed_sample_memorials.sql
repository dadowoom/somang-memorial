-- Retired seed.
--
-- This migration used to insert 96 fictional `sample-memorial-###` records so the
-- memorial list looked populated before launch. Those records were removed from the
-- production database, and they must not come back: a rebuilt or restored database
-- would put fictional people into the public name search next to real members.
--
-- The file is emptied instead of deleted so that the migration journal stays intact
-- for databases that already applied it.
SELECT 1;
