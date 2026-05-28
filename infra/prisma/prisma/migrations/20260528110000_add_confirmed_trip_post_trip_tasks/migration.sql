-- Create post-trip task option/selection tables for completed tour follow-up tracking.
CREATE TABLE `ConfirmedTripPostTripTaskOption` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `colorTone` VARCHAR(191) NOT NULL DEFAULT 'slate',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CTPTTO_label_uq`(`label`),
    INDEX `CTPTTO_active_sort_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ConfirmedTripPostTripTaskSelection` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CTPTTS_trip_option_uq`(`confirmedTripId`, `optionId`),
    INDEX `CTPTTS_trip_idx`(`confirmedTripId`),
    INDEX `CTPTTS_option_idx`(`optionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ConfirmedTripPostTripTaskSelection` ADD CONSTRAINT `CTPTTS_trip_fkey` FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConfirmedTripPostTripTaskSelection` ADD CONSTRAINT `CTPTTS_option_fkey` FOREIGN KEY (`optionId`) REFERENCES `ConfirmedTripPostTripTaskOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default post-trip task options migrated from the previous Notion workflow.
INSERT INTO `ConfirmedTripPostTripTaskOption` (`id`, `label`, `colorTone`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  (REPLACE(UUID(), '-', ''), '보증금 환급', 'slate', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '리뷰/폼 안내', 'slate', 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '채널안내', 'slate', 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '조심', 'slate', 3, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), 'X', 'slate', 4, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
