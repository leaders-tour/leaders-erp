-- Catalog place many-to-many regions (ADD-only)

CREATE TABLE `CatalogPlaceRegion` (
    `placeId` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,

    INDEX `CatalogPlaceRegion_regionId_idx`(`regionId`),
    PRIMARY KEY (`placeId`, `regionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CatalogPlaceRegion`
  ADD CONSTRAINT `CatalogPlaceRegion_placeId_fkey`
  FOREIGN KEY (`placeId`) REFERENCES `CatalogPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CatalogPlaceRegion`
  ADD CONSTRAINT `CatalogPlaceRegion_regionId_fkey`
  FOREIGN KEY (`regionId`) REFERENCES `CatalogRegion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `CatalogPlaceRegion` (`placeId`, `regionId`)
SELECT `id`, `regionId`
FROM `CatalogPlace`
WHERE `regionId` IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM `CatalogRegion` WHERE `CatalogRegion`.`id` = `CatalogPlace`.`regionId`
  );
