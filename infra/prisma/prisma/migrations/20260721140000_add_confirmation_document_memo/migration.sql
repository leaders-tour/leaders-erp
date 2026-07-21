CREATE TABLE `ConfirmationDocumentMemo` (
  `id` VARCHAR(191) NOT NULL,
  `confirmationDocumentId` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `updatedByEmployeeId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ConfirmationDocumentMemo_confirmationDocumentId_key`(`confirmationDocumentId`),
  INDEX `ConfirmationDocumentMemo_updatedByEmployeeId_idx`(`updatedByEmployeeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ConfirmationDocumentMemo`
  ADD CONSTRAINT `ConfirmationDocumentMemo_confirmationDocumentId_fkey`
  FOREIGN KEY (`confirmationDocumentId`) REFERENCES `ConfirmationDocument`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConfirmationDocumentMemo`
  ADD CONSTRAINT `ConfirmationDocumentMemo_updatedByEmployeeId_fkey`
  FOREIGN KEY (`updatedByEmployeeId`) REFERENCES `Employee`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
