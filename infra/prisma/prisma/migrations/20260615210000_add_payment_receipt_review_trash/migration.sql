ALTER TABLE `ContractPaymentReceipt`
  ADD COLUMN `reviewTrashedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewTrashedByEmployeeId` VARCHAR(191) NULL,
  ADD COLUMN `reviewTrashReason` TEXT NULL;

UPDATE `ContractPaymentReceipt`
SET
  `paymentMatchMode` = 'AUTO',
  `reviewTrashedAt` = COALESCE(`manualMatchedAt`, CURRENT_TIMESTAMP(3))
WHERE `paymentMatchMode` = 'MANUAL_HOLD';
