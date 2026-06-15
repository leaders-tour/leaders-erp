ALTER TABLE `ContractPaymentReceipt`
  ADD COLUMN `paymentMatchMode` ENUM('AUTO', 'MANUAL_MATCH', 'MANUAL_HOLD') NOT NULL DEFAULT 'AUTO',
  ADD COLUMN `manualMatchedByEmployeeId` VARCHAR(191) NULL,
  ADD COLUMN `manualMatchedAt` DATETIME(3) NULL;
