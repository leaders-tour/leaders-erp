-- CreateTable
CREATE TABLE `ConfirmationDocument` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripId` VARCHAR(191) NOT NULL,
    `planVersionId` VARCHAR(191) NULL,
    `documentNumber` VARCHAR(191) NULL,
    `versionNumber` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `snapshot` JSON NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `publishedByEmployeeId` VARCHAR(191) NULL,
    `createdByEmployeeId` VARCHAR(191) NULL,
    `updatedByEmployeeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConfirmationDocument_confirmedTripId_versionNumber_key`(`confirmedTripId`, `versionNumber`),
    INDEX `ConfirmationDocument_confirmedTripId_status_idx`(`confirmedTripId`, `status`),
    INDEX `ConfirmationDocument_confirmedTripId_publishedAt_idx`(`confirmedTripId`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfirmationDocument` ADD CONSTRAINT `ConfirmationDocument_confirmedTripId_fkey` FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmationDocument` ADD CONSTRAINT `ConfirmationDocument_planVersionId_fkey` FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmationDocument` ADD CONSTRAINT `ConfirmationDocument_publishedByEmployeeId_fkey` FOREIGN KEY (`publishedByEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmationDocument` ADD CONSTRAINT `ConfirmationDocument_createdByEmployeeId_fkey` FOREIGN KEY (`createdByEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmationDocument` ADD CONSTRAINT `ConfirmationDocument_updatedByEmployeeId_fkey` FOREIGN KEY (`updatedByEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
