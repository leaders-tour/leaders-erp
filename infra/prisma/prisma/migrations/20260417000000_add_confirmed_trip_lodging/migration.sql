-- CreateTable
CREATE TABLE `ConfirmedTripLodging` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripId` VARCHAR(191) NOT NULL,
    `dayIndex` INTEGER NOT NULL,
    `checkInDate` DATETIME(3) NOT NULL,
    `checkOutDate` DATETIME(3) NOT NULL,
    `nights` INTEGER NOT NULL,
    `type` ENUM('ACCOMMODATION', 'LV1', 'LV2', 'LV3', 'LV4', 'NIGHT_TRAIN', 'CUSTOM_TEXT') NOT NULL,
    `accommodationId` VARCHAR(191) NULL,
    `accommodationOptionId` VARCHAR(191) NULL,
    `lodgingNameSnapshot` VARCHAR(191) NOT NULL,
    `pricePerNightKrw` INTEGER NULL,
    `roomCount` INTEGER NOT NULL DEFAULT 1,
    `totalPriceKrw` INTEGER NULL,
    `bookingStatus` ENUM('PENDING', 'REQUESTED', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `bookingMemo` TEXT NULL,
    `bookingReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CTL_tripId_dayIndex_idx`(`confirmedTripId`, `dayIndex`),
    INDEX `CTL_accId_dates_idx`(`accommodationId`, `checkInDate`, `checkOutDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfirmedTripLodging` ADD CONSTRAINT `ConfirmedTripLodging_confirmedTripId_fkey` FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmedTripLodging` ADD CONSTRAINT `ConfirmedTripLodging_accommodationId_fkey` FOREIGN KEY (`accommodationId`) REFERENCES `Accommodation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
