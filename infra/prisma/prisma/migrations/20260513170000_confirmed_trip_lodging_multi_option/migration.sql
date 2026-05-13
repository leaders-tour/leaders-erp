-- CreateTable
CREATE TABLE `ConfirmedTripLodgingOption` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripLodgingId` VARCHAR(191) NOT NULL,
    `accommodationOptionId` VARCHAR(191) NOT NULL,
    `roomCount` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CTLO_lodging_opt_uq`(`confirmedTripLodgingId`, `accommodationOptionId`),
    INDEX `CTLO_lodgingId_idx`(`confirmedTripLodgingId`),
    INDEX `CTLO_accOptId_idx`(`accommodationOptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfirmedTripLodgingOption` ADD CONSTRAINT `CTLO_lodging_fk` FOREIGN KEY (`confirmedTripLodgingId`) REFERENCES `ConfirmedTripLodging`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmedTripLodgingOption` ADD CONSTRAINT `CTLO_accOpt_fk` FOREIGN KEY (`accommodationOptionId`) REFERENCES `AccommodationOption`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill from legacy single-option column (숙소에 해당 옵션이 속할 때만)
INSERT INTO `ConfirmedTripLodgingOption` (`id`, `confirmedTripLodgingId`, `accommodationOptionId`, `roomCount`, `createdAt`, `updatedAt`)
SELECT CONCAT('migopt_', `ctl`.`id`),
       `ctl`.`id`,
       `ctl`.`accommodationOptionId`,
       `ctl`.`roomCount`,
       NOW(3),
       NOW(3)
FROM `ConfirmedTripLodging` `ctl`
INNER JOIN `AccommodationOption` `ao`
  ON `ao`.`id` = `ctl`.`accommodationOptionId`
 AND (`ctl`.`accommodationId` IS NULL OR `ao`.`accommodationId` = `ctl`.`accommodationId`)
WHERE `ctl`.`accommodationOptionId` IS NOT NULL;

-- Drop legacy column (옵션은 조인 테이블로 관리)
ALTER TABLE `ConfirmedTripLodging` DROP COLUMN `accommodationOptionId`;
