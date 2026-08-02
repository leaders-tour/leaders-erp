-- renderAppendixData was added during a partially applied attempt of this migration.

-- CreateTable
CREATE TABLE IF NOT EXISTS `GuideConfirmationDeliveryOutbox` (
  `id` VARCHAR(191) NOT NULL,
  `confirmationDocumentId` VARCHAR(191) NOT NULL,
  `authUserId` VARCHAR(191) NOT NULL,
  `action` ENUM('PUBLISH', 'REVOKE') NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `versionNumber` INTEGER NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `GuideConfirmationDeliveryOutbox_idempotencyKey_key`(`idempotencyKey`),
  INDEX `GCDO_status_nextAttempt_idx`(`status`, `nextAttemptAt`),
  INDEX `GCDO_doc_auth_idx`(`confirmationDocumentId`, `authUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GuideConfirmationDeliveryOutbox`
  ADD CONSTRAINT `GuideConfirmationDeliveryOutbox_confirmationDocumentId_fkey`
  FOREIGN KEY (`confirmationDocumentId`) REFERENCES `ConfirmationDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
