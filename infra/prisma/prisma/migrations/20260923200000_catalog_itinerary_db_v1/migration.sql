-- Catalog itinerary DB v1 (ADD-only). Accommodation 테이블 ALTER 없음.

ALTER TABLE `CatalogPlace`
  ADD COLUMN `displayName` VARCHAR(191) NULL,
  ADD COLUMN `internalNote` TEXT NULL,
  ADD COLUMN `accommodationId` VARCHAR(191) NULL,
  ADD COLUMN `visitRadiusM` INTEGER NULL;

CREATE INDEX `CatalogPlace_accommodationId_idx` ON `CatalogPlace`(`accommodationId`);

ALTER TABLE `CatalogPlace`
  ADD CONSTRAINT `CatalogPlace_accommodationId_fkey`
  FOREIGN KEY (`accommodationId`) REFERENCES `Accommodation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CatalogElement`
  ADD COLUMN `lifecycleStatus` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE `CatalogBlockPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `blockId` VARCHAR(191) NOT NULL,
    `elementId` VARCHAR(191) NOT NULL,
    `dayIndex` INTEGER NOT NULL DEFAULT 1,
    `orderIndex` INTEGER NOT NULL,
    `startLabel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogBlockPlacement_blockId_dayIndex_orderIndex_key`(`blockId`, `dayIndex`, `orderIndex`),
    INDEX `CatalogBlockPlacement_elementId_idx`(`elementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CatalogBlockPlacement`
  ADD CONSTRAINT `CatalogBlockPlacement_blockId_fkey`
  FOREIGN KEY (`blockId`) REFERENCES `CatalogBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogBlockPlacement`
  ADD CONSTRAINT `CatalogBlockPlacement_elementId_fkey`
  FOREIGN KEY (`elementId`) REFERENCES `CatalogElement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `CatalogJourney` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `nightCount` INTEGER NOT NULL DEFAULT 0,
    `dayCount` INTEGER NOT NULL DEFAULT 1,
    `calcStatusText` VARCHAR(191) NOT NULL DEFAULT '미정',
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogJourney_code_key`(`code`),
    INDEX `CatalogJourney_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogJourneyPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `journeyId` VARCHAR(191) NOT NULL,
    `blockId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `dayOffset` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogJourneyPlacement_journeyId_orderIndex_key`(`journeyId`, `orderIndex`),
    INDEX `CatalogJourneyPlacement_blockId_idx`(`blockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CatalogJourneyPlacement`
  ADD CONSTRAINT `CatalogJourneyPlacement_journeyId_fkey`
  FOREIGN KEY (`journeyId`) REFERENCES `CatalogJourney`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogJourneyPlacement`
  ADD CONSTRAINT `CatalogJourneyPlacement_blockId_fkey`
  FOREIGN KEY (`blockId`) REFERENCES `CatalogBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `CatalogChangeLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorLabel` VARCHAR(191) NOT NULL DEFAULT 'staff',
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CatalogChangeLog_targetType_targetId_createdAt_idx`(`targetType`, `targetId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
