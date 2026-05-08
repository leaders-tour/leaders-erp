-- AlterTable
ALTER TABLE `Region` ADD COLUMN `alwaysIncludeFirstDayStart` BOOLEAN NOT NULL DEFAULT false;

-- 백필: 울란바토르 지역
UPDATE `Region` SET `alwaysIncludeFirstDayStart` = true WHERE `name` = '울란바토르';
