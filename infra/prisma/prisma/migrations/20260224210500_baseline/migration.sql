-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Region` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `regionName` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `defaultLodgingType` VARCHAR(191) NOT NULL,
    `internalMovementDistance` INTEGER NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `currentVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Location_regionId_idx`(`regionId`),
    INDEX `Location_currentVersionId_idx`(`currentVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationGuide` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `imageUrls` JSON NOT NULL,
    `locationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LocationGuide_locationId_key`(`locationId`),
    INDEX `LocationGuide_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationVersion` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `changeNote` VARCHAR(191) NULL,
    `locationNameSnapshot` VARCHAR(191) NOT NULL,
    `regionNameSnapshot` VARCHAR(191) NOT NULL,
    `internalMovementDistance` INTEGER NULL,
    `defaultLodgingType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocationVersion_locationId_idx`(`locationId`),
    UNIQUE INDEX `LocationVersion_locationId_versionNumber_key`(`locationId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_notice` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `contentMd` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_version_safety_notice` (
    `id` VARCHAR(191) NOT NULL,
    `locationVersionId` VARCHAR(191) NOT NULL,
    `safetyNoticeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `location_version_safety_notice_locationVersionId_idx`(`locationVersionId`),
    INDEX `location_version_safety_notice_safetyNoticeId_idx`(`safetyNoticeId`),
    UNIQUE INDEX `location_version_safety_notice_locationVersionId_safetyNotic_key`(`locationVersionId`, `safetyNoticeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Segment` (
    `id` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `regionName` VARCHAR(191) NOT NULL,
    `fromLocationId` VARCHAR(191) NOT NULL,
    `toLocationId` VARCHAR(191) NOT NULL,
    `averageDistanceKm` DOUBLE NOT NULL,
    `averageTravelHours` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Segment_regionId_idx`(`regionId`),
    UNIQUE INDEX `Segment_fromLocationId_toLocationId_key`(`fromLocationId`, `toLocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `currentVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Plan_userId_idx`(`userId`),
    INDEX `Plan_regionId_idx`(`regionId`),
    INDEX `Plan_currentVersionId_idx`(`currentVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanVersion` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `parentVersionId` VARCHAR(191) NULL,
    `versionNumber` INTEGER NOT NULL,
    `variantType` ENUM('basic', 'early', 'afternoon', 'extend') NOT NULL,
    `totalDays` INTEGER NOT NULL,
    `changeNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanVersion_planId_idx`(`planId`),
    INDEX `PlanVersion_parentVersionId_idx`(`parentVersionId`),
    UNIQUE INDEX `PlanVersion_planId_versionNumber_key`(`planId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanVersionMeta` (
    `id` VARCHAR(191) NOT NULL,
    `planVersionId` VARCHAR(191) NOT NULL,
    `leaderName` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NOT NULL,
    `travelStartDate` DATETIME(3) NOT NULL,
    `travelEndDate` DATETIME(3) NOT NULL,
    `headcountTotal` INTEGER NOT NULL,
    `headcountMale` INTEGER NOT NULL,
    `headcountFemale` INTEGER NOT NULL,
    `vehicleType` VARCHAR(191) NOT NULL,
    `flightInTime` VARCHAR(191) NOT NULL,
    `flightOutTime` VARCHAR(191) NOT NULL,
    `pickupDropNote` VARCHAR(191) NULL,
    `externalPickupDropNote` VARCHAR(191) NULL,
    `rentalItemsText` TEXT NOT NULL,
    `eventCodes` JSON NOT NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlanVersionMeta_planVersionId_key`(`planVersionId`),
    UNIQUE INDEX `PlanVersionMeta_documentNumber_key`(`documentNumber`),
    INDEX `PlanVersionMeta_travelStartDate_idx`(`travelStartDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanStop` (
    `id` VARCHAR(191) NOT NULL,
    `planVersionId` VARCHAR(191) NOT NULL,
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

    INDEX `PlanStop_planVersionId_idx`(`planVersionId`),
    INDEX `PlanStop_locationId_idx`(`locationId`),
    INDEX `PlanStop_locationVersionId_idx`(`locationVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lodging` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `locationVersionId` VARCHAR(191) NULL,
    `locationNameSnapshot` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `specialNotes` VARCHAR(191) NULL,
    `isUnspecified` BOOLEAN NOT NULL DEFAULT false,
    `hasElectricity` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
    `hasShower` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
    `hasInternet` ENUM('YES', 'LIMITED', 'NO') NOT NULL DEFAULT 'NO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lodging_locationId_idx`(`locationId`),
    INDEX `Lodging_locationVersionId_idx`(`locationVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MealSet` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `locationVersionId` VARCHAR(191) NULL,
    `locationNameSnapshot` VARCHAR(191) NOT NULL,
    `setName` VARCHAR(191) NOT NULL,
    `breakfast` ENUM('CAMP_MEAL', 'LOCAL_RESTAURANT', 'PORK_PARTY', 'HORHOG', 'SHASHLIK', 'SHABU_SHABU') NULL,
    `lunch` ENUM('CAMP_MEAL', 'LOCAL_RESTAURANT', 'PORK_PARTY', 'HORHOG', 'SHASHLIK', 'SHABU_SHABU') NULL,
    `dinner` ENUM('CAMP_MEAL', 'LOCAL_RESTAURANT', 'PORK_PARTY', 'HORHOG', 'SHASHLIK', 'SHABU_SHABU') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MealSet_locationId_idx`(`locationId`),
    INDEX `MealSet_locationVersionId_idx`(`locationVersionId`),
    UNIQUE INDEX `MealSet_locationVersionId_setName_key`(`locationVersionId`, `setName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeBlock` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `locationVersionId` VARCHAR(191) NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TimeBlock_locationId_idx`(`locationId`),
    INDEX `TimeBlock_locationVersionId_idx`(`locationVersionId`),
    UNIQUE INDEX `TimeBlock_locationVersionId_orderIndex_key`(`locationVersionId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Activity` (
    `id` VARCHAR(191) NOT NULL,
    `timeBlockId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `conditionNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Activity_timeBlockId_idx`(`timeBlockId`),
    UNIQUE INDEX `Activity_timeBlockId_orderIndex_key`(`timeBlockId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Override` (
    `id` VARCHAR(191) NOT NULL,
    `planVersionId` VARCHAR(191) NOT NULL,
    `targetType` ENUM('DayPlan', 'TimeBlock', 'Activity') NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Override_planVersionId_idx`(`planVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_currentVersionId_fkey` FOREIGN KEY (`currentVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationGuide` ADD CONSTRAINT `LocationGuide_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationVersion` ADD CONSTRAINT `LocationVersion_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_version_safety_notice` ADD CONSTRAINT `location_version_safety_notice_locationVersionId_fkey` FOREIGN KEY (`locationVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_version_safety_notice` ADD CONSTRAINT `location_version_safety_notice_safetyNoticeId_fkey` FOREIGN KEY (`safetyNoticeId`) REFERENCES `safety_notice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Segment` ADD CONSTRAINT `Segment_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Segment` ADD CONSTRAINT `Segment_fromLocationId_fkey` FOREIGN KEY (`fromLocationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Segment` ADD CONSTRAINT `Segment_toLocationId_fkey` FOREIGN KEY (`toLocationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plan` ADD CONSTRAINT `Plan_currentVersionId_fkey` FOREIGN KEY (`currentVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanVersion` ADD CONSTRAINT `PlanVersion_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanVersion` ADD CONSTRAINT `PlanVersion_parentVersionId_fkey` FOREIGN KEY (`parentVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanVersionMeta` ADD CONSTRAINT `PlanVersionMeta_planVersionId_fkey` FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_planVersionId_fkey` FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_locationVersionId_fkey` FOREIGN KEY (`locationVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lodging` ADD CONSTRAINT `Lodging_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lodging` ADD CONSTRAINT `Lodging_locationVersionId_fkey` FOREIGN KEY (`locationVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealSet` ADD CONSTRAINT `MealSet_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealSet` ADD CONSTRAINT `MealSet_locationVersionId_fkey` FOREIGN KEY (`locationVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeBlock` ADD CONSTRAINT `TimeBlock_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeBlock` ADD CONSTRAINT `TimeBlock_locationVersionId_fkey` FOREIGN KEY (`locationVersionId`) REFERENCES `LocationVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_timeBlockId_fkey` FOREIGN KEY (`timeBlockId`) REFERENCES `TimeBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Override` ADD CONSTRAINT `Override_planVersionId_fkey` FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

