-- CreateTable
CREATE TABLE `ConfirmedTripKoreaTeamStageOption` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `colorTone` VARCHAR(191) NOT NULL DEFAULT 'slate',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CTKTSO_label_uq`(`label`),
    INDEX `CTKTSO_active_sort_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConfirmedTripKoreaTeamStageSelection` (
    `id` VARCHAR(191) NOT NULL,
    `confirmedTripId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CTKTSS_trip_option_uq`(`confirmedTripId`, `optionId`),
    INDEX `CTKTSS_trip_idx`(`confirmedTripId`),
    INDEX `CTKTSS_option_idx`(`optionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfirmedTripKoreaTeamStageSelection` ADD CONSTRAINT `CTKTSS_trip_fkey` FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConfirmedTripKoreaTeamStageSelection` ADD CONSTRAINT `CTKTSS_option_fkey` FOREIGN KEY (`optionId`) REFERENCES `ConfirmedTripKoreaTeamStageOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default options
INSERT INTO `ConfirmedTripKoreaTeamStageOption` (`id`, `label`, `colorTone`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  (REPLACE(UUID(), '-', ''), '확정서', 'slate', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '최종확인(확정서)', 'slate', 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '오픈채팅', 'slate', 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '입장/초대', 'slate', 3, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
