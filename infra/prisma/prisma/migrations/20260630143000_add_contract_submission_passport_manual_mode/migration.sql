-- ContractSubmission: manual passport photo management mode and audit fields
ALTER TABLE `ContractSubmission`
  ADD COLUMN `passportPhotoSourceMode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO',
  ADD COLUMN `passportPhotoManualByEmployeeId` VARCHAR(191) NULL,
  ADD COLUMN `passportPhotoManualAt` DATETIME(3) NULL;
