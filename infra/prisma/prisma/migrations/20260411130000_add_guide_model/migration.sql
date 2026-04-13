-- CreateTable
CREATE TABLE `Guide` (
    `id` VARCHAR(191) NOT NULL,
    `nameKo` VARCHAR(191) NOT NULL,
    `nameMn` VARCHAR(191) NULL,
    `level` ENUM('MAIN','JUNIOR','ROOKIE','OTHER') NOT NULL DEFAULT 'OTHER',
    `status` ENUM('ACTIVE_SEASON','INTERVIEW_DONE','INACTIVE','OTHER') NOT NULL DEFAULT 'OTHER',
    `gender` ENUM('MALE','FEMALE') NULL,
    `birthYear` INTEGER NULL,
    `isSmoker` BOOLEAN NOT NULL DEFAULT false,
    `experienceYears` INTEGER NULL,
    `joinYear` INTEGER NULL,
    `phone` VARCHAR(191) NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `certImageUrls` JSON NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Guide_level_idx`(`level`),
    INDEX `Guide_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
