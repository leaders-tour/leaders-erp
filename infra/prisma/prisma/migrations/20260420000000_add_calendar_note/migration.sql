-- CreateTable
CREATE TABLE `CalendarNote` (
  `id` VARCHAR(36) NOT NULL,
  `occursOn` DATE NOT NULL,
  `kind` ENUM('GUEST_HOUSE','PICKUP','DROP','CAMEL_DOLL','CUSTOM') NOT NULL,
  `customText` VARCHAR(500) NULL,
  `confirmedTripId` VARCHAR(36) NULL,
  `memo` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `CalendarNote_occursOn_idx`(`occursOn`),
  INDEX `CalendarNote_confirmedTripId_idx`(`confirmedTripId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CalendarNote` ADD CONSTRAINT `CalendarNote_confirmedTripId_fkey`
  FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
