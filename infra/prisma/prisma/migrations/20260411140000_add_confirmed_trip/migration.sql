-- CreateTable
CREATE TABLE `ConfirmedTrip` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `planVersionId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedByEmployeeId` VARCHAR(191) NULL,
    `guideName` VARCHAR(191) NULL,
    `driverName` VARCHAR(191) NULL,
    `assignedVehicle` VARCHAR(191) NULL,
    `accommodationNote` TEXT NULL,
    `operationNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ConfirmedTrip_userId_idx`(`userId`),
    INDEX `ConfirmedTrip_planId_idx`(`planId`),
    INDEX `ConfirmedTrip_planVersionId_idx`(`planVersionId`),
    INDEX `ConfirmedTrip_status_confirmedAt_idx`(`status`, `confirmedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfirmedTrip` ADD CONSTRAINT `ConfirmedTrip_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmedTrip` ADD CONSTRAINT `ConfirmedTrip_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmedTrip` ADD CONSTRAINT `ConfirmedTrip_planVersionId_fkey` FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmedTrip` ADD CONSTRAINT `ConfirmedTrip_confirmedByEmployeeId_fkey` FOREIGN KEY (`confirmedByEmployeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
