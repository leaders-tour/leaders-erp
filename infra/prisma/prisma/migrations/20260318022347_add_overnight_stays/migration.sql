-- AlterTable
ALTER TABLE `PlanStop` ADD COLUMN `overnightStayConnectionId` VARCHAR(191) NULL,
    ADD COLUMN `overnightStayConnectionVersionId` VARCHAR(191) NULL,
    ADD COLUMN `overnightStayDayOrder` INTEGER NULL,
    ADD COLUMN `overnightStayId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PlanTemplateStop` ADD COLUMN `overnightStayConnectionId` VARCHAR(191) NULL,
    ADD COLUMN `overnightStayConnectionVersionId` VARCHAR(191) NULL,
    ADD COLUMN `overnightStayDayOrder` INTEGER NULL,
    ADD COLUMN `overnightStayId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `OvernightStay` (
    `id` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OvernightStay_locationId_key`(`locationId`),
    INDEX `OvernightStay_regionId_idx`(`regionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayDay` (
    `id` VARCHAR(191) NOT NULL,
    `overnightStayId` VARCHAR(191) NOT NULL,
    `dayOrder` INTEGER NOT NULL,
    `averageDistanceKm` DOUBLE NOT NULL,
    `averageTravelHours` DOUBLE NOT NULL,
    `timeCellText` TEXT NOT NULL,
    `scheduleCellText` TEXT NOT NULL,
    `lodgingCellText` TEXT NOT NULL,
    `mealCellText` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayDay_overnightStayId_idx`(`overnightStayId`),
    UNIQUE INDEX `OvernightStayDay_overnightStayId_dayOrder_key`(`overnightStayId`, `dayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayConnection` (
    `id` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `regionName` VARCHAR(191) NOT NULL,
    `fromOvernightStayId` VARCHAR(191) NOT NULL,
    `toLocationId` VARCHAR(191) NOT NULL,
    `defaultVersionId` VARCHAR(191) NULL,
    `averageDistanceKm` DOUBLE NOT NULL,
    `averageTravelHours` DOUBLE NOT NULL,
    `isLongDistance` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayConnection_regionId_idx`(`regionId`),
    INDEX `OvernightStayConnection_defaultVersionId_idx`(`defaultVersionId`),
    UNIQUE INDEX `OvernightStayConnection_fromOvernightStayId_toLocationId_key`(`fromOvernightStayId`, `toLocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayConnectionVersion` (
    `id` VARCHAR(191) NOT NULL,
    `overnightStayConnectionId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `averageDistanceKm` DOUBLE NOT NULL,
    `averageTravelHours` DOUBLE NOT NULL,
    `isLongDistance` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayConnectionVersion_overnightStayConnectionId_idx`(`overnightStayConnectionId`),
    UNIQUE INDEX `OvernightStayConnectionVersion_overnightStayConnectionId_sor_key`(`overnightStayConnectionId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayConnectionVersionTimeBlock` (
    `id` VARCHAR(191) NOT NULL,
    `overnightStayConnectionVersionId` VARCHAR(191) NOT NULL,
    `variant` ENUM('basic', 'early', 'extend', 'earlyExtend') NOT NULL DEFAULT 'basic',
    `startTime` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayConnectionVersionTimeBlock_overnightStayConnect_idx`(`overnightStayConnectionVersionId`),
    UNIQUE INDEX `OvernightStayConnectionVersionTimeBlock_overnightStayConnect_key`(`overnightStayConnectionVersionId`, `variant`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayConnectionVersionActivity` (
    `id` VARCHAR(191) NOT NULL,
    `overnightStayConnectionVersionTimeBlockId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `conditionNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayConnectionVersionActivity_overnightStayConnecti_idx`(`overnightStayConnectionVersionTimeBlockId`),
    UNIQUE INDEX `OvernightStayConnectionVersionActivity_overnightStayConnecti_key`(`overnightStayConnectionVersionTimeBlockId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayConnectionTimeBlock` (
    `id` VARCHAR(191) NOT NULL,
    `overnightStayConnectionId` VARCHAR(191) NOT NULL,
    `variant` ENUM('basic', 'early', 'extend', 'earlyExtend') NOT NULL DEFAULT 'basic',
    `startTime` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayConnectionTimeBlock_overnightStayConnectionId_idx`(`overnightStayConnectionId`),
    UNIQUE INDEX `OvernightStayConnectionTimeBlock_overnightStayConnectionId_v_key`(`overnightStayConnectionId`, `variant`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OvernightStayConnectionActivity` (
    `id` VARCHAR(191) NOT NULL,
    `overnightStayConnectionTimeBlockId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `conditionNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OvernightStayConnectionActivity_overnightStayConnectionTimeB_idx`(`overnightStayConnectionTimeBlockId`),
    UNIQUE INDEX `OvernightStayConnectionActivity_overnightStayConnectionTimeB_key`(`overnightStayConnectionTimeBlockId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `PlanStop_overnightStayId_idx` ON `PlanStop`(`overnightStayId`);

-- CreateIndex
CREATE INDEX `PlanStop_overnightStayConnectionId_idx` ON `PlanStop`(`overnightStayConnectionId`);

-- CreateIndex
CREATE INDEX `PlanStop_overnightStayConnectionVersionId_idx` ON `PlanStop`(`overnightStayConnectionVersionId`);

-- CreateIndex
CREATE INDEX `PlanTemplateStop_overnightStayId_idx` ON `PlanTemplateStop`(`overnightStayId`);

-- CreateIndex
CREATE INDEX `PlanTemplateStop_overnightStayConnectionId_idx` ON `PlanTemplateStop`(`overnightStayConnectionId`);

-- CreateIndex
CREATE INDEX `PlanTemplateStop_overnightStayConnectionVersionId_idx` ON `PlanTemplateStop`(`overnightStayConnectionVersionId`);

-- AddForeignKey
ALTER TABLE `OvernightStay` ADD CONSTRAINT `OvernightStay_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStay` ADD CONSTRAINT `OvernightStay_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayDay` ADD CONSTRAINT `OvernightStayDay_overnightStayId_fkey` FOREIGN KEY (`overnightStayId`) REFERENCES `OvernightStay`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnection` ADD CONSTRAINT `OvernightStayConnection_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnection` ADD CONSTRAINT `OvernightStayConnection_fromOvernightStayId_fkey` FOREIGN KEY (`fromOvernightStayId`) REFERENCES `OvernightStay`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnection` ADD CONSTRAINT `OvernightStayConnection_toLocationId_fkey` FOREIGN KEY (`toLocationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnection` ADD CONSTRAINT `OvernightStayConnection_defaultVersionId_fkey` FOREIGN KEY (`defaultVersionId`) REFERENCES `OvernightStayConnectionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnectionVersion` ADD CONSTRAINT `OvernightStayConnectionVersion_overnightStayConnectionId_fkey` FOREIGN KEY (`overnightStayConnectionId`) REFERENCES `OvernightStayConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnectionVersionTimeBlock` ADD CONSTRAINT `OvernightStayConnectionVersionTimeBlock_overnightStayConnec_fkey` FOREIGN KEY (`overnightStayConnectionVersionId`) REFERENCES `OvernightStayConnectionVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnectionVersionActivity` ADD CONSTRAINT `OvernightStayConnectionVersionActivity_overnightStayConnect_fkey` FOREIGN KEY (`overnightStayConnectionVersionTimeBlockId`) REFERENCES `OvernightStayConnectionVersionTimeBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_overnightStayId_fkey` FOREIGN KEY (`overnightStayId`) REFERENCES `OvernightStay`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_overnightStayConnectionId_fkey` FOREIGN KEY (`overnightStayConnectionId`) REFERENCES `OvernightStayConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_overnightStayConnectionVersionId_fkey` FOREIGN KEY (`overnightStayConnectionVersionId`) REFERENCES `OvernightStayConnectionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_overnightStayId_fkey` FOREIGN KEY (`overnightStayId`) REFERENCES `OvernightStay`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_overnightStayConnectionId_fkey` FOREIGN KEY (`overnightStayConnectionId`) REFERENCES `OvernightStayConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_overnightStayConnectionVersionId_fkey` FOREIGN KEY (`overnightStayConnectionVersionId`) REFERENCES `OvernightStayConnectionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnectionTimeBlock` ADD CONSTRAINT `OvernightStayConnectionTimeBlock_overnightStayConnectionId_fkey` FOREIGN KEY (`overnightStayConnectionId`) REFERENCES `OvernightStayConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OvernightStayConnectionActivity` ADD CONSTRAINT `OvernightStayConnectionActivity_overnightStayConnectionTime_fkey` FOREIGN KEY (`overnightStayConnectionTimeBlockId`) REFERENCES `OvernightStayConnectionTimeBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

