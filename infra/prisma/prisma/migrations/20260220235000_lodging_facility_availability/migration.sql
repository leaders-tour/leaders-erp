-- Add new enum-like columns as VARCHAR/ENUM and migrate boolean values
ALTER TABLE `Lodging`
  ADD COLUMN `hasElectricity_new` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
  ADD COLUMN `hasShower_new` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
  ADD COLUMN `hasInternet_new` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO';

UPDATE `Lodging`
SET
  `hasElectricity_new` = CASE WHEN `hasElectricity` = 1 THEN 'YES' ELSE 'NO' END,
  `hasShower_new` = CASE WHEN `hasShower` = 1 THEN 'YES' ELSE 'NO' END,
  `hasInternet_new` = CASE WHEN `hasInternet` = 1 THEN 'YES' ELSE 'NO' END;

ALTER TABLE `Lodging`
  DROP COLUMN `hasElectricity`,
  DROP COLUMN `hasShower`,
  DROP COLUMN `hasInternet`;

ALTER TABLE `Lodging`
  CHANGE COLUMN `hasElectricity_new` `hasElectricity` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
  CHANGE COLUMN `hasShower_new` `hasShower` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
  CHANGE COLUMN `hasInternet_new` `hasInternet` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO';
