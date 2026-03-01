-- CreateTable
CREATE TABLE `PlanTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `totalDays` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanTemplate_regionId_totalDays_isActive_sortOrder_idx`(`regionId`, `totalDays`, `isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanTemplateStop` (
    `id` VARCHAR(191) NOT NULL,
    `planTemplateId` VARCHAR(191) NOT NULL,
    `dayIndex` INTEGER NOT NULL,
    `locationId` VARCHAR(191) NULL,
    `locationVersionId` VARCHAR(191) NULL,
    `dateCellText` TEXT NOT NULL,
    `destinationCellText` TEXT NOT NULL,
    `timeCellText` TEXT NOT NULL,
    `scheduleCellText` TEXT NOT NULL,
    `lodgingCellText` TEXT NOT NULL,
    `mealCellText` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanTemplateStop_planTemplateId_idx`(`planTemplateId`),
    INDEX `PlanTemplateStop_locationId_idx`(`locationId`),
    INDEX `PlanTemplateStop_locationVersionId_idx`(`locationVersionId`),
    UNIQUE INDEX `PlanTemplateStop_planTemplateId_dayIndex_key`(`planTemplateId`, `dayIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlanTemplate` ADD CONSTRAINT `PlanTemplate_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_planTemplateId_fkey` FOREIGN KEY (`planTemplateId`) REFERENCES `PlanTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_locationVersionId_fkey` FOREIGN KEY (`locationVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
