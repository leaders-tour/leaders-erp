CREATE TABLE `ContractPaymentSource` (
  `id` VARCHAR(191) NOT NULL,
  `type` ENUM('GOOGLE_SHEET') NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sheetId` VARCHAR(191) NULL,
  `sheetGid` VARCHAR(191) NULL,
  `headerRow` INTEGER NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ContractPaymentSource_type_isActive_idx` (`type`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContractPaymentReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `sourceRowNumber` INTEGER NULL,
  `sourceRecordKey` VARCHAR(191) NOT NULL,
  `receivedAt` DATETIME(3) NULL,
  `payerNameRaw` VARCHAR(191) NULL,
  `payerNameNorm` VARCHAR(191) NULL,
  `amountKrw` INTEGER NULL,
  `matchedDocumentNumberNorm` VARCHAR(191) NULL,
  `needsReviewReason` VARCHAR(191) NULL,
  `rowDigest` VARCHAR(191) NOT NULL,
  `rawJson` JSON NOT NULL,
  `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ContractPaymentReceipt_payerNameNorm_amountKrw_idx` (`payerNameNorm`, `amountKrw`),
  INDEX `ContractPaymentReceipt_matchedDocumentNumberNorm_idx` (`matchedDocumentNumberNorm`),
  UNIQUE INDEX `ContractPaymentReceipt_sourceId_sourceRecordKey_key` (`sourceId`, `sourceRecordKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContractPaymentStatus` (
  `id` VARCHAR(191) NOT NULL,
  `documentNumberNorm` VARCHAR(191) NOT NULL,
  `requiredAmountKrw` INTEGER NULL,
  `receivedAmountKrw` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('NOT_STARTED', 'PARTIAL', 'COMPLETED', 'OVERPAID', 'NEEDS_REVIEW') NOT NULL DEFAULT 'NOT_STARTED',
  `needsReviewReason` VARCHAR(191) NULL,
  `matchedPlanVersionId` VARCHAR(191) NULL,
  `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ContractPaymentStatus_documentNumberNorm_key` (`documentNumberNorm`),
  INDEX `ContractPaymentStatus_status_idx` (`status`),
  INDEX `ContractPaymentStatus_matchedPlanVersionId_idx` (`matchedPlanVersionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContractPaymentSyncRun` (
  `id` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NOT NULL,
  `status` ENUM('RUNNING', 'SUCCESS', 'FAILED') NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  `fetchedRows` INTEGER NOT NULL DEFAULT 0,
  `upsertedRows` INTEGER NOT NULL DEFAULT 0,
  `skippedRows` INTEGER NOT NULL DEFAULT 0,
  `matchedRows` INTEGER NOT NULL DEFAULT 0,
  `reviewRows` INTEGER NOT NULL DEFAULT 0,
  `errorMessage` TEXT NULL,
  INDEX `ContractPaymentSyncRun_sourceId_startedAt_idx` (`sourceId`, `startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContractPaymentReceipt`
  ADD CONSTRAINT `ContractPaymentReceipt_sourceId_fkey`
  FOREIGN KEY (`sourceId`) REFERENCES `ContractPaymentSource` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ContractPaymentSyncRun`
  ADD CONSTRAINT `ContractPaymentSyncRun_sourceId_fkey`
  FOREIGN KEY (`sourceId`) REFERENCES `ContractPaymentSource` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `ContractPaymentSource` (`id`, `type`, `name`, `isActive`, `sheetId`, `sheetGid`, `headerRow`, `createdAt`, `updatedAt`)
VALUES (
  'contract-payment-sheet-default',
  'GOOGLE_SHEET',
  '계약 입금 시트',
  true,
  '157c3UaRpsRUvopX7WpW9YCZhsw7yWbWFRSyPQ5UE6YI',
  '652607249',
  1,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
