-- CreateTable
CREATE TABLE `Driver` (
    `id` VARCHAR(191) NOT NULL,
    `nameMn` VARCHAR(191) NOT NULL,
    `vehicleType` ENUM('STAREX','HIACE','PURGON','LAND_CRUISER','ALPHARD','OTHER') NOT NULL DEFAULT 'OTHER',
    `vehicleNumber` VARCHAR(191) NULL,
    `vehicleOptions` VARCHAR(191) NULL,
    `vehicleYear` INTEGER NULL,
    `maxPassengers` INTEGER NULL,
    `level` ENUM('MAIN','JUNIOR','ROOKIE','OTHER') NOT NULL DEFAULT 'OTHER',
    `status` ENUM('ACTIVE_SEASON','INTERVIEW_DONE','BLACKLISTED','OTHER') NOT NULL DEFAULT 'OTHER',
    `gender` ENUM('MALE','FEMALE') NULL,
    `birthYear` INTEGER NULL,
    `isSmoker` BOOLEAN NOT NULL DEFAULT false,
    `hasTouristLicense` BOOLEAN NOT NULL DEFAULT false,
    `joinYear` INTEGER NULL,
    `phone` VARCHAR(191) NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `vehicleImageUrls` JSON NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Driver_level_idx`(`level`),
    INDEX `Driver_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
