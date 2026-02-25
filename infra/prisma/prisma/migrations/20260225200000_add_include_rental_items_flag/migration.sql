ALTER TABLE `PlanVersionMeta`
  ADD COLUMN `includeRentalItems` BOOLEAN NULL;

UPDATE `PlanVersionMeta`
SET `includeRentalItems` = TRUE
WHERE `includeRentalItems` IS NULL;

ALTER TABLE `PlanVersionMeta`
  MODIFY COLUMN `includeRentalItems` BOOLEAN NOT NULL DEFAULT TRUE;
