-- CreateTable
CREATE TABLE `PlanVersionTransportGroup` (
    `id` VARCHAR(191) NOT NULL,
    `planVersionMetaId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `teamName` VARCHAR(191) NOT NULL,
    `headcount` INTEGER NOT NULL,
    `flightInDate` DATETIME(3) NOT NULL,
    `flightInTime` VARCHAR(191) NOT NULL,
    `flightOutDate` DATETIME(3) NOT NULL,
    `flightOutTime` VARCHAR(191) NOT NULL,
    `pickupDate` DATETIME(3) NULL,
    `pickupTime` VARCHAR(191) NULL,
    `pickupPlaceType` ENUM('AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM') NULL,
    `pickupPlaceCustomText` VARCHAR(191) NULL,
    `dropDate` DATETIME(3) NULL,
    `dropTime` VARCHAR(191) NULL,
    `dropPlaceType` ENUM('AIRPORT', 'OZ_HOUSE', 'ULAANBAATAR', 'CUSTOM') NULL,
    `dropPlaceCustomText` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanVersionTransportGroup_planVersionMetaId_orderIndex_idx`(`planVersionMetaId`, `orderIndex`),
    UNIQUE INDEX `PlanVersionTransportGroup_planVersionMetaId_orderIndex_key`(`planVersionMetaId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlanVersionTransportGroup` ADD CONSTRAINT `PlanVersionTransportGroup_planVersionMetaId_fkey` FOREIGN KEY (`planVersionMetaId`) REFERENCES `PlanVersionMeta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
