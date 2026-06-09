-- AlterTable
ALTER TABLE `ContractSubmission`
    ADD COLUMN `excludedFromContractCount` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `excludedByEmployeeId` VARCHAR(191) NULL,
    ADD COLUMN `excludedAt` DATETIME(3) NULL,
    ADD COLUMN `exclusionReason` TEXT NULL;
