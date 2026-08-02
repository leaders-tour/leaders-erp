-- CreateTable
CREATE TABLE `GuideTripNoteDeliveryOutbox` (
  `id` VARCHAR(191) NOT NULL,
  `noteId` VARCHAR(191) NOT NULL,
  `confirmedTripId` VARCHAR(191) NOT NULL,
  `authUserId` VARCHAR(191) NOT NULL,
  `action` ENUM('UPSERT', 'REVOKE') NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `GuideTripNoteDeliveryOutbox_idempotencyKey_key`(`idempotencyKey`),
  INDEX `GTNDO_status_nextAttempt_idx`(`status`, `nextAttemptAt`),
  INDEX `GTNDO_trip_auth_idx`(`confirmedTripId`, `authUserId`),
  INDEX `GTNDO_note_auth_idx`(`noteId`, `authUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
