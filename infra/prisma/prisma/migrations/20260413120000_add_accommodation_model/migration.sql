-- CreateTable
CREATE TABLE `Accommodation` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Accommodation_region_idx`(`region`),
    INDEX `Accommodation_destination_idx`(`destination`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccommodationOption` (
    `id` VARCHAR(191) NOT NULL,
    `accommodationId` VARCHAR(191) NOT NULL,
    `roomType` VARCHAR(191) NOT NULL,
    `level` ENUM('LV2','LV3','LV4','LV5') NOT NULL DEFAULT 'LV3',
    `priceOffSeason` INTEGER NULL,
    `pricePeakSeason` INTEGER NULL,
    `paymentMethod` ENUM('PER_PERSON','PER_ROOM') NULL,
    `mealCostPerServing` INTEGER NULL,
    `capacity` VARCHAR(191) NULL,
    `mealIncluded` BOOLEAN NOT NULL DEFAULT false,
    `facilities` VARCHAR(191) NULL,
    `bookingPriority` VARCHAR(191) NULL,
    `bookingMethod` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `googleMapsUrl` TEXT NULL,
    `openingDate` VARCHAR(191) NULL,
    `closingDate` VARCHAR(191) NULL,
    `imageUrls` JSON NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AccommodationOption_accommodationId_idx`(`accommodationId`),
    INDEX `AccommodationOption_level_idx`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccommodationOption` ADD CONSTRAINT `AccommodationOption_accommodationId_fkey` FOREIGN KEY (`accommodationId`) REFERENCES `Accommodation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
