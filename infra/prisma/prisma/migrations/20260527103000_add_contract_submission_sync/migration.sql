-- Contract form submissions: source-agnostic ledger and document-number summary.

CREATE TABLE `ContractSubmissionSource` (
  `id` VARCHAR(191) NOT NULL,
  `type` ENUM('GOOGLE_SHEET', 'INTERNAL_FORM') NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sheetId` VARCHAR(191) NULL,
  `sheetGid` VARCHAR(191) NULL,
  `headerRow` INTEGER NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ContractSubmissionSource_type_isActive_idx` (`type`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContractSubmission` (
  `id` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `sourceRowNumber` INTEGER NULL,
  `sourceRecordKey` VARCHAR(191) NOT NULL,
  `submittedAt` DATETIME(3) NULL,
  `documentNumberRaw` VARCHAR(191) NULL,
  `documentNumberNorm` VARCHAR(191) NULL,
  `travelerName` VARCHAR(191) NULL,
  `travelerPhone` VARCHAR(191) NULL,
  `travelerPhoneDigits` VARCHAR(191) NULL,
  `leaderName` VARCHAR(191) NULL,
  `representativeType` VARCHAR(191) NULL,
  `totalCompanionCount` INTEGER NULL,
  `receivedStatus` VARCHAR(191) NULL,
  `rowDigest` VARCHAR(191) NOT NULL,
  `rawJson` JSON NOT NULL,
  `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ContractSubmission_sourceId_sourceRecordKey_key` (`sourceId`, `sourceRecordKey`),
  INDEX `ContractSubmission_documentNumberNorm_idx` (`documentNumberNorm`),
  INDEX `ContractSubmission_travelerName_travelerPhoneDigits_idx` (`travelerName`, `travelerPhoneDigits`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContractDocumentStatus` (
  `id` VARCHAR(191) NOT NULL,
  `documentNumberNorm` VARCHAR(191) NOT NULL,
  `documentNumberRawSample` VARCHAR(191) NULL,
  `expectedCount` INTEGER NULL,
  `submittedCount` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVER_SUBMITTED', 'NEEDS_REVIEW') NOT NULL DEFAULT 'NOT_STARTED',
  `needsReviewReason` VARCHAR(191) NULL,
  `firstSubmittedAt` DATETIME(3) NULL,
  `lastSubmittedAt` DATETIME(3) NULL,
  `matchedPlanVersionId` VARCHAR(191) NULL,
  `matchedConfirmedTripId` VARCHAR(191) NULL,
  `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ContractDocumentStatus_documentNumberNorm_key` (`documentNumberNorm`),
  INDEX `ContractDocumentStatus_status_idx` (`status`),
  INDEX `ContractDocumentStatus_matchedPlanVersionId_idx` (`matchedPlanVersionId`),
  INDEX `ContractDocumentStatus_matchedConfirmedTripId_idx` (`matchedConfirmedTripId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContractSyncRun` (
  `id` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `status` ENUM('RUNNING', 'SUCCESS', 'FAILED') NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  `fetchedRows` INTEGER NOT NULL DEFAULT 0,
  `upsertedRows` INTEGER NOT NULL DEFAULT 0,
  `skippedRows` INTEGER NOT NULL DEFAULT 0,
  `errorMessage` TEXT NULL,

  INDEX `ContractSyncRun_sourceId_startedAt_idx` (`sourceId`, `startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContractSubmission`
  ADD CONSTRAINT `ContractSubmission_sourceId_fkey`
  FOREIGN KEY (`sourceId`) REFERENCES `ContractSubmissionSource`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ContractSyncRun`
  ADD CONSTRAINT `ContractSyncRun_sourceId_fkey`
  FOREIGN KEY (`sourceId`) REFERENCES `ContractSubmissionSource`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `ContractSubmissionSource` (`id`, `type`, `name`, `isActive`, `sheetId`, `sheetGid`, `headerRow`, `createdAt`, `updatedAt`)
VALUES (
  REPLACE(UUID(), '-', ''),
  'GOOGLE_SHEET',
  '계약서 구글폼 응답',
  true,
  '1bLOoc7wCCbriJCdr6W9BKkhCTzOnrO9U-jog8FsGtCw',
  '0',
  1,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
