-- AlterTable
ALTER TABLE `PlanVersionMeta` ADD COLUMN `validUntilDate` DATETIME(3) NULL;

-- Backfill: meta.createdAt (date) + 14 days
UPDATE `PlanVersionMeta`
SET `validUntilDate` = DATE_ADD(DATE(`createdAt`), INTERVAL 14 DAY)
WHERE `validUntilDate` IS NULL;
