-- AlterTable: Accommodation에 phone, facilities, bookingMethod, openingDate, closingDate 추가
ALTER TABLE `Accommodation` ADD COLUMN `phone` VARCHAR(191);
ALTER TABLE `Accommodation` ADD COLUMN `facilities` VARCHAR(191);
ALTER TABLE `Accommodation` ADD COLUMN `bookingMethod` VARCHAR(191);
ALTER TABLE `Accommodation` ADD COLUMN `openingDate` VARCHAR(191);
ALTER TABLE `Accommodation` ADD COLUMN `closingDate` VARCHAR(191);

-- AlterTable: AccommodationOption에서 해당 컬럼 제거
ALTER TABLE `AccommodationOption` DROP COLUMN `phone`;
ALTER TABLE `AccommodationOption` DROP COLUMN `facilities`;
ALTER TABLE `AccommodationOption` DROP COLUMN `bookingMethod`;
ALTER TABLE `AccommodationOption` DROP COLUMN `openingDate`;
ALTER TABLE `AccommodationOption` DROP COLUMN `closingDate`;
