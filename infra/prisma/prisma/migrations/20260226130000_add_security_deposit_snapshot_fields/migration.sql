ALTER TABLE `PlanVersionPricing`
  ADD COLUMN `securityDepositAmountKrw` INT NOT NULL DEFAULT 0,
  ADD COLUMN `securityDepositUnitPriceKrw` INT NOT NULL DEFAULT 0,
  ADD COLUMN `securityDepositQuantity` INT NOT NULL DEFAULT 0,
  ADD COLUMN `securityDepositMode` ENUM('NONE', 'PER_PERSON', 'PER_TEAM') NOT NULL DEFAULT 'NONE',
  ADD COLUMN `securityDepositEventId` VARCHAR(191) NULL;

ALTER TABLE `PlanVersionPricing`
  ADD CONSTRAINT `PlanVersionPricing_securityDepositEventId_fkey`
  FOREIGN KEY (`securityDepositEventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `PlanVersionPricing_securityDepositEventId_idx` ON `PlanVersionPricing`(`securityDepositEventId`);
