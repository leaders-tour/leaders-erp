ALTER TABLE `PlanStop`
  ADD COLUMN `dateCellText` TEXT NULL,
  ADD COLUMN `destinationCellText` TEXT NULL,
  ADD COLUMN `timeCellText` TEXT NULL,
  ADD COLUMN `scheduleCellText` TEXT NULL,
  ADD COLUMN `lodgingCellText` TEXT NULL,
  ADD COLUMN `mealCellText` TEXT NULL;

UPDATE `PlanStop` AS ps
LEFT JOIN `Location` AS fl ON fl.`id` = ps.`fromLocationId`
LEFT JOIN `Location` AS tl ON tl.`id` = ps.`toLocationId`
SET
  ps.`dateCellText` = CONCAT(ps.`dayIndex`, '일차'),
  ps.`destinationCellText` = CONCAT(COALESCE(fl.`name`, ps.`fromLocationId`), ' -> ', COALESCE(tl.`name`, ps.`toLocationId`)),
  ps.`timeCellText` = '',
  ps.`scheduleCellText` = '',
  ps.`lodgingCellText` = COALESCE(ps.`lodgingText`, ''),
  ps.`mealCellText` = COALESCE(ps.`mealsText`, '');

ALTER TABLE `PlanStop`
  MODIFY `dateCellText` TEXT NOT NULL,
  MODIFY `destinationCellText` TEXT NOT NULL,
  MODIFY `timeCellText` TEXT NOT NULL,
  MODIFY `scheduleCellText` TEXT NOT NULL,
  MODIFY `lodgingCellText` TEXT NOT NULL,
  MODIFY `mealCellText` TEXT NOT NULL;

ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_fromLocationId_fkey`;
ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_toLocationId_fkey`;
ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_lodgingId_fkey`;
ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_mealSetId_fkey`;

DROP INDEX `PlanStop_planId_dayIndex_key` ON `PlanStop`;
DROP INDEX `PlanStop_fromLocationId_idx` ON `PlanStop`;
DROP INDEX `PlanStop_toLocationId_idx` ON `PlanStop`;
DROP INDEX `PlanStop_lodgingId_idx` ON `PlanStop`;
DROP INDEX `PlanStop_mealSetId_idx` ON `PlanStop`;

ALTER TABLE `PlanStop`
  DROP COLUMN `dayIndex`,
  DROP COLUMN `fromLocationId`,
  DROP COLUMN `toLocationId`,
  DROP COLUMN `lodgingId`,
  DROP COLUMN `mealSetId`,
  DROP COLUMN `distanceText`,
  DROP COLUMN `lodgingText`,
  DROP COLUMN `mealsText`;
