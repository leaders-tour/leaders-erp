-- AlterTable
ALTER TABLE `PlanVersionMeta` ADD COLUMN `dropPlaceCustomText` VARCHAR(191) NULL,
    ADD COLUMN `dropPlaceType` ENUM('AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM') NULL,
    ADD COLUMN `externalDropPlaceCustomText` VARCHAR(191) NULL,
    ADD COLUMN `externalDropPlaceType` ENUM('AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM') NULL,
    ADD COLUMN `externalPickupPlaceCustomText` VARCHAR(191) NULL,
    ADD COLUMN `externalPickupPlaceType` ENUM('AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM') NULL,
    ADD COLUMN `pickupPlaceCustomText` VARCHAR(191) NULL,
    ADD COLUMN `pickupPlaceType` ENUM('AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM') NULL;

