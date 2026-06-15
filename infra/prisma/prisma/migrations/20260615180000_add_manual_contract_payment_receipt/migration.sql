ALTER TABLE `ContractPaymentSource`
  MODIFY `type` ENUM('GOOGLE_SHEET', 'MANUAL') NOT NULL;

ALTER TABLE `ContractPaymentReceipt`
  ADD COLUMN `memo` TEXT NULL;

INSERT INTO `ContractPaymentSource` (`id`, `type`, `name`, `isActive`, `sheetId`, `sheetGid`, `headerRow`, `createdAt`, `updatedAt`)
VALUES (
  'contract-payment-manual-default',
  'MANUAL',
  'ERP 수동 입금',
  true,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);
