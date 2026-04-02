-- AlterTable
ALTER TABLE `PricingRule`
  ADD COLUMN `displayLabelOverride` VARCHAR(191) NULL,
  ADD COLUMN `chargeScope` ENUM('TEAM', 'PER_PERSON') NULL,
  ADD COLUMN `personMode` ENUM('SINGLE', 'PER_DAY', 'PER_NIGHT') NULL,
  ADD COLUMN `customDisplayText` TEXT NULL;

-- AlterTable
ALTER TABLE `PricingRule`
  MODIFY `quantitySource` ENUM(
    'ONE',
    'HEADCOUNT',
    'TOTAL_DAYS',
    'LONG_DISTANCE_SEGMENT_COUNT',
    'SUM_EXTRA_LODGING_COUNTS'
  ) NOT NULL;
