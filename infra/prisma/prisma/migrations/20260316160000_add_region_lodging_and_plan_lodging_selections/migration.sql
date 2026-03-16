-- Add lodging selection snapshots for existing plan version metadata.
ALTER TABLE `PlanVersionMeta` ADD COLUMN `lodgingSelections` JSON NULL;

UPDATE `PlanVersionMeta`
SET `lodgingSelections` = JSON_ARRAY()
WHERE `lodgingSelections` IS NULL;

ALTER TABLE `PlanVersionMeta` MODIFY `lodgingSelections` JSON NOT NULL;

-- Extend pricing line enums for lodging selection adjustments.
ALTER TABLE `PlanVersionPricingLine`
  MODIFY `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL;

ALTER TABLE `PricingRule`
  MODIFY `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL,
  MODIFY `targetLineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NULL;

-- Add region-level lodging catalog for itinerary builder custom lodging selection.
CREATE TABLE `RegionLodging` (
  `id` VARCHAR(191) NOT NULL,
  `regionId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `priceKrw` INTEGER NULL,
  `pricePerPersonKrw` INTEGER NULL,
  `pricePerTeamKrw` INTEGER NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `RegionLodging_regionId_isActive_sortOrder_idx` (`regionId`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RegionLodging`
  ADD CONSTRAINT `RegionLodging_regionId_fkey`
  FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
