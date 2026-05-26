CREATE TABLE `ConfirmedTripNote` (
  `id` VARCHAR(191) NOT NULL,
  `confirmedTripId` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `createdByEmployeeId` VARCHAR(191) NOT NULL,
  `createdByName` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ConfirmedTripNote_confirmedTripId_createdAt_idx`(`confirmedTripId`, `createdAt`),
  INDEX `ConfirmedTripNote_createdByEmployeeId_idx`(`createdByEmployeeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ConfirmedTripNote`
  ADD CONSTRAINT `ConfirmedTripNote_confirmedTripId_fkey`
  FOREIGN KEY (`confirmedTripId`) REFERENCES `ConfirmedTrip`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConfirmedTripNote`
  ADD CONSTRAINT `ConfirmedTripNote_createdByEmployeeId_fkey`
  FOREIGN KEY (`createdByEmployeeId`) REFERENCES `Employee`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
