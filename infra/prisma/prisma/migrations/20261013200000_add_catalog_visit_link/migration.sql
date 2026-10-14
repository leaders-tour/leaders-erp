-- Catalog visit-place links (ADD-only)

CREATE TABLE `CatalogVisitLink` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NOT NULL,
    `durationMs` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `visitRegion` VARCHAR(191) NULL,
    `placeId` VARCHAR(191) NULL,
    `status` ENUM('AUTO', 'REVIEW', 'UNLINKED', 'MANUAL') NOT NULL,
    `distanceM` INTEGER NULL,
    `reviewReason` ENUM('OVERLAP', 'NONE') NULL,
    `candidates` JSON NOT NULL,
    `analyzedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogVisitLink_visitId_key`(`visitId`),
    INDEX `CatalogVisitLink_status_idx`(`status`),
    INDEX `CatalogVisitLink_projectId_idx`(`projectId`),
    INDEX `CatalogVisitLink_placeId_idx`(`placeId`),
    INDEX `CatalogVisitLink_visitRegion_idx`(`visitRegion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CatalogVisitLink`
  ADD CONSTRAINT `CatalogVisitLink_placeId_fkey`
  FOREIGN KEY (`placeId`) REFERENCES `CatalogPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
