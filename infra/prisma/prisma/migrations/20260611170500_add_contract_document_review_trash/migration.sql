-- AlterTable
ALTER TABLE `ContractDocumentStatus`
    ADD COLUMN `reviewTrashedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewTrashedByEmployeeId` VARCHAR(191) NULL,
    ADD COLUMN `reviewTrashReason` TEXT NULL,
    ADD COLUMN `reviewTrashRestoredAt` DATETIME(3) NULL;
