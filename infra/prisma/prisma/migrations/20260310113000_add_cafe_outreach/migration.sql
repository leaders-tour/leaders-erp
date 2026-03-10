ALTER TABLE `PlanVersionMeta`
  MODIFY `specialNote` TEXT NULL;

CREATE TABLE `CafeSource` (
  `id` VARCHAR(191) NOT NULL,
  `sourceType` ENUM('NAVER_CAFE_BOARD') NOT NULL,
  `cafeId` VARCHAR(191) NOT NULL,
  `menuId` VARCHAR(191) NOT NULL,
  `boardName` VARCHAR(191) NOT NULL,
  `boardUrl` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `CafeSource_isActive_sourceType_idx`(`isActive`, `sourceType`),
  UNIQUE INDEX `CafeSource_sourceType_cafeId_menuId_key`(`sourceType`, `cafeId`, `menuId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CafeLead` (
  `id` VARCHAR(191) NOT NULL,
  `cafeSourceId` VARCHAR(191) NOT NULL,
  `articleId` VARCHAR(191) NOT NULL,
  `articleUrl` TEXT NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `authorNickname` VARCHAR(191) NULL,
  `postedAtRaw` VARCHAR(191) NULL,
  `postedAt` DATETIME(3) NULL,
  `views` INTEGER NULL,
  `commentCount` INTEGER NULL,
  `rawHtml` LONGTEXT NULL,
  `rawText` LONGTEXT NULL,
  `rawMetadataJson` JSON NULL,
  `parsedNeedsJson` JSON NULL,
  `contactEmail` VARCHAR(191) NULL,
  `contactPhone` VARCHAR(191) NULL,
  `leadScore` INTEGER NULL,
  `status` ENUM('DISCOVERED', 'FETCHED', 'PARSED', 'DRAFTED', 'APPROVED', 'SENT', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'DISCOVERED',
  `failReason` TEXT NULL,
  `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `CafeLead_articleId_key`(`articleId`),
  INDEX `CafeLead_cafeSourceId_status_createdAt_idx`(`cafeSourceId`, `status`, `createdAt`),
  INDEX `CafeLead_status_leadScore_idx`(`status`, `leadScore`),
  INDEX `CafeLead_contactEmail_idx`(`contactEmail`),
  INDEX `CafeLead_postedAt_idx`(`postedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OutreachDraft` (
  `id` VARCHAR(191) NOT NULL,
  `cafeLeadId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `previewText` VARCHAR(191) NULL,
  `bodyText` LONGTEXT NOT NULL,
  `bodyHtml` LONGTEXT NOT NULL,
  `promptVersion` VARCHAR(191) NOT NULL,
  `modelName` VARCHAR(191) NOT NULL,
  `qualityScore` INTEGER NULL,
  `reviewStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EDITED') NOT NULL DEFAULT 'PENDING',
  `reviewerId` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `OutreachDraft_reviewStatus_updatedAt_idx`(`reviewStatus`, `updatedAt`),
  INDEX `OutreachDraft_reviewerId_idx`(`reviewerId`),
  UNIQUE INDEX `OutreachDraft_cafeLeadId_version_key`(`cafeLeadId`, `version`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OutboundMessage` (
  `id` VARCHAR(191) NOT NULL,
  `draftId` VARCHAR(191) NOT NULL,
  `channel` ENUM('EMAIL') NOT NULL DEFAULT 'EMAIL',
  `toEmail` VARCHAR(191) NOT NULL,
  `deliveryStatus` ENUM('QUEUED', 'SENT', 'FAILED', 'BOUNCED') NOT NULL DEFAULT 'QUEUED',
  `provider` VARCHAR(191) NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `failReason` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `OutboundMessage_draftId_createdAt_idx`(`draftId`, `createdAt`),
  INDEX `OutboundMessage_deliveryStatus_createdAt_idx`(`deliveryStatus`, `createdAt`),
  INDEX `OutboundMessage_toEmail_createdAt_idx`(`toEmail`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContactSuppression` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ContactSuppression_email_key`(`email`),
  INDEX `ContactSuppression_isActive_email_idx`(`isActive`, `email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CafeLead`
  ADD CONSTRAINT `CafeLead_cafeSourceId_fkey`
  FOREIGN KEY (`cafeSourceId`) REFERENCES `CafeSource`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OutreachDraft`
  ADD CONSTRAINT `OutreachDraft_cafeLeadId_fkey`
  FOREIGN KEY (`cafeLeadId`) REFERENCES `CafeLead`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OutreachDraft`
  ADD CONSTRAINT `OutreachDraft_reviewerId_fkey`
  FOREIGN KEY (`reviewerId`) REFERENCES `Employee`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `OutboundMessage`
  ADD CONSTRAINT `OutboundMessage_draftId_fkey`
  FOREIGN KEY (`draftId`) REFERENCES `OutreachDraft`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
