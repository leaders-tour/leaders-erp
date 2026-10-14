-- Catalog route observations (ADD-only)

CREATE TABLE `CatalogRouteObservation` (
    `id` VARCHAR(191) NOT NULL,
    `fromVisitLinkId` VARCHAR(191) NOT NULL,
    `toVisitLinkId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `fromPlaceId` VARCHAR(191) NOT NULL,
    `toPlaceId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NULL,
    `departedAt` DATETIME(3) NOT NULL,
    `arrivedAt` DATETIME(3) NOT NULL,
    `elapsedMs` INTEGER NOT NULL,
    `distanceKm` DOUBLE NULL,
    `maxGapMinutes` INTEGER NOT NULL,
    `includeDistance` BOOLEAN NOT NULL,
    `includeElapsed` BOOLEAN NOT NULL,
    `status` ENUM('AUTO', 'HOLD') NOT NULL,
    `holdReason` ENUM('GAP', 'JUMP', 'NO_PATH') NULL,
    `path` JSON NOT NULL,
    `analyzedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CatalogRouteObservation_projectId_idx`(`projectId`),
    INDEX `CatalogRouteObservation_routeId_idx`(`routeId`),
    INDEX `CatalogRouteObservation_status_idx`(`status`),
    INDEX `CatalogRouteObservation_fromPlaceId_toPlaceId_idx`(`fromPlaceId`, `toPlaceId`),
    UNIQUE INDEX `CatalogRouteObservation_fromVisitLinkId_toVisitLinkId_key`(`fromVisitLinkId`, `toVisitLinkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CatalogRouteObservation`
  ADD CONSTRAINT `CatalogRouteObservation_fromVisitLinkId_fkey`
  FOREIGN KEY (`fromVisitLinkId`) REFERENCES `CatalogVisitLink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogRouteObservation`
  ADD CONSTRAINT `CatalogRouteObservation_toVisitLinkId_fkey`
  FOREIGN KEY (`toVisitLinkId`) REFERENCES `CatalogVisitLink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogRouteObservation`
  ADD CONSTRAINT `CatalogRouteObservation_fromPlaceId_fkey`
  FOREIGN KEY (`fromPlaceId`) REFERENCES `CatalogPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogRouteObservation`
  ADD CONSTRAINT `CatalogRouteObservation_toPlaceId_fkey`
  FOREIGN KEY (`toPlaceId`) REFERENCES `CatalogPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogRouteObservation`
  ADD CONSTRAINT `CatalogRouteObservation_routeId_fkey`
  FOREIGN KEY (`routeId`) REFERENCES `CatalogRoute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
