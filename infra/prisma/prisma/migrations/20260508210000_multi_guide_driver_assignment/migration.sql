-- 다중 가이드·기사 배정: 조인 테이블 추가 후 단일 FK 컬럼 제거

CREATE TABLE `ConfirmedTripGuideAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `role` ENUM('MAIN', 'ASSISTANT') NOT NULL DEFAULT 'MAIN',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `nameSnapshot` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConfirmedTripGuideAssignment_confirmedTripId_guideId_key`(`confirmedTripId`, `guideId`),
    INDEX `ConfirmedTripGuideAssignment_confirmedTripId_idx`(`confirmedTripId`),
    INDEX `ConfirmedTripGuideAssignment_guideId_idx`(`guideId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ConfirmedTripGuideAssignment` ADD CONSTRAINT `ConfirmedTripGuideAssignment_confirmedTripId_fkey` FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConfirmedTripGuideAssignment` ADD CONSTRAINT `ConfirmedTripGuideAssignment_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `Guide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ConfirmedTripDriverAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `role` ENUM('MAIN', 'ASSISTANT') NOT NULL DEFAULT 'MAIN',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `nameSnapshot` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ConfirmedTripDriverAssignment_confirmedTripId_driverId_key`(`confirmedTripId`, `driverId`),
    INDEX `ConfirmedTripDriverAssignment_confirmedTripId_idx`(`confirmedTripId`),
    INDEX `ConfirmedTripDriverAssignment_driverId_idx`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ConfirmedTripDriverAssignment` ADD CONSTRAINT `ConfirmedTripDriverAssignment_confirmedTripId_fkey` FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConfirmedTripDriverAssignment` ADD CONSTRAINT `ConfirmedTripDriverAssignment_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `ConfirmedTripGuideAssignment` (`id`, `confirmedTripId`, `guideId`, `role`, `sortOrder`, `nameSnapshot`, `createdAt`, `updatedAt`)
SELECT REPLACE(UUID(), '-', ''), `id`, `guideId`, 'MAIN', 0, `guideName`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `ConfirmedTrip`
WHERE `guideId` IS NOT NULL;

INSERT INTO `ConfirmedTripDriverAssignment` (`id`, `confirmedTripId`, `driverId`, `role`, `sortOrder`, `nameSnapshot`, `createdAt`, `updatedAt`)
SELECT REPLACE(UUID(), '-', ''), `id`, `driverId`, 'MAIN', 0, `driverName`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `ConfirmedTrip`
WHERE `driverId` IS NOT NULL;

ALTER TABLE `ConfirmedTrip` DROP FOREIGN KEY `ConfirmedTrip_guideId_fkey`;

ALTER TABLE `ConfirmedTrip` DROP FOREIGN KEY `ConfirmedTrip_driverId_fkey`;

DROP INDEX `ConfirmedTrip_guideId_idx` ON `ConfirmedTrip`;

DROP INDEX `ConfirmedTrip_driverId_idx` ON `ConfirmedTrip`;

ALTER TABLE `ConfirmedTrip` DROP COLUMN `guideName`, DROP COLUMN `driverName`, DROP COLUMN `guideId`, DROP COLUMN `driverId`;
