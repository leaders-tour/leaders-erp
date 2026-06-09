-- AlterTable
ALTER TABLE `ContractDocumentStatus`
    ADD COLUMN `manualMatchedPlanVersionId` VARCHAR(191) NULL,
    ADD COLUMN `manualMatchedByEmployeeId` VARCHAR(191) NULL,
    ADD COLUMN `manualMatchedAt` DATETIME(3) NULL,
    ADD COLUMN `manualMatchNote` TEXT NULL;

-- CreateIndex
CREATE INDEX `ContractDocumentStatus_manualMatchedPlanVersionId_idx` ON `ContractDocumentStatus`(`manualMatchedPlanVersionId`);
