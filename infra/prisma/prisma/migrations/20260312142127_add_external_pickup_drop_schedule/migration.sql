-- AlterTable
ALTER TABLE `PlanVersionMeta` ADD COLUMN `externalDropDate` DATETIME(3) NULL,
    ADD COLUMN `externalDropTime` VARCHAR(191) NULL,
    ADD COLUMN `externalPickupDate` DATETIME(3) NULL,
    ADD COLUMN `externalPickupTime` VARCHAR(191) NULL;

