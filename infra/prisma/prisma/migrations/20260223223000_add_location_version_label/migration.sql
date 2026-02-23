ALTER TABLE `LocationVersion`
  ADD COLUMN `label` VARCHAR(191) NULL;

UPDATE `LocationVersion`
SET `label` = CASE
  WHEN `changeNote` IS NOT NULL AND TRIM(`changeNote`) <> '' THEN TRIM(`changeNote`)
  ELSE CONCAT('v', `versionNumber`)
END
WHERE `label` IS NULL;

ALTER TABLE `LocationVersion`
  MODIFY `label` VARCHAR(191) NOT NULL;
