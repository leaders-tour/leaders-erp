-- CreateTable
CREATE TABLE `RegionSet` (
    `id` VARCHAR(191) NOT NULL,
    `signature` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RegionSet_signature_key`(`signature`),
    INDEX `RegionSet_isActive_deletedAt_idx`(`isActive`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegionSetItem` (
    `id` VARCHAR(191) NOT NULL,
    `regionSetId` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RegionSetItem_regionSetId_idx`(`regionSetId`),
    INDEX `RegionSetItem_regionId_idx`(`regionId`),
    UNIQUE INDEX `RegionSetItem_regionSetId_regionId_key`(`regionSetId`, `regionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Region` ADD COLUMN `defaultRegionSetId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Region_defaultRegionSetId_key` ON `Region`(`defaultRegionSetId`);

-- Backfill singleton RegionSet per Region (RegionSet.id = Region.id for stable Plan.regionSetId migration)
INSERT INTO `RegionSet` (`id`, `signature`, `name`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, `id`, `name`, true, NOW(3), NOW(3) FROM `Region`;

INSERT INTO `RegionSetItem` (`id`, `regionSetId`, `regionId`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT CONCAT(`id`, '_item0'), `id`, `id`, 0, NOW(3), NOW(3) FROM `Region`;

UPDATE `Region` SET `defaultRegionSetId` = `id`;

-- AlterTable Plan
ALTER TABLE `Plan` ADD COLUMN `regionSetId` VARCHAR(191) NULL;

UPDATE `Plan` SET `regionSetId` = `regionId`;

ALTER TABLE `Plan` DROP FOREIGN KEY `Plan_regionId_fkey`;

DROP INDEX `Plan_regionId_idx` ON `Plan`;

ALTER TABLE `Plan` DROP COLUMN `regionId`;

CREATE INDEX `Plan_regionSetId_idx` ON `Plan`(`regionSetId`);

ALTER TABLE `Plan` MODIFY `regionSetId` VARCHAR(191) NOT NULL;

ALTER TABLE `Plan` ADD CONSTRAINT `Plan_regionSetId_fkey` FOREIGN KEY (`regionSetId`) REFERENCES `RegionSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable PlanTemplate
ALTER TABLE `PlanTemplate` ADD COLUMN `regionSetId` VARCHAR(191) NULL;

UPDATE `PlanTemplate` SET `regionSetId` = `regionId`;

ALTER TABLE `PlanTemplate` DROP FOREIGN KEY `PlanTemplate_regionId_fkey`;

DROP INDEX `PlanTemplate_regionId_totalDays_isActive_sortOrder_idx` ON `PlanTemplate`;

ALTER TABLE `PlanTemplate` DROP COLUMN `regionId`;

CREATE INDEX `PlanTemplate_regionSetId_totalDays_isActive_sortOrder_idx` ON `PlanTemplate`(`regionSetId`, `totalDays`, `isActive`, `sortOrder`);

ALTER TABLE `PlanTemplate` MODIFY `regionSetId` VARCHAR(191) NOT NULL;

ALTER TABLE `PlanTemplate` ADD CONSTRAINT `PlanTemplate_regionSetId_fkey` FOREIGN KEY (`regionSetId`) REFERENCES `RegionSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegionSetItem` ADD CONSTRAINT `RegionSetItem_regionSetId_fkey` FOREIGN KEY (`regionSetId`) REFERENCES `RegionSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RegionSetItem` ADD CONSTRAINT `RegionSetItem_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Region` ADD CONSTRAINT `Region_defaultRegionSetId_fkey` FOREIGN KEY (`defaultRegionSetId`) REFERENCES `RegionSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
