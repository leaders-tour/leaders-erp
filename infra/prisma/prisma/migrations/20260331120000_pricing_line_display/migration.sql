-- AlterTable
ALTER TABLE `PlanVersionPricingLine` ADD COLUMN `displayBasis` ENUM(
  'TEAM_DIV_PERSON',
  'PER_NIGHT',
  'PER_DAY',
  'PER_PERSON_SINGLE',
  'PERCENT',
  'CUSTOM'
) NULL,
  ADD COLUMN `displayLabel` VARCHAR(191) NULL,
  ADD COLUMN `displayUnitAmountKrw` INTEGER NULL,
  ADD COLUMN `displayCount` INTEGER NULL,
  ADD COLUMN `displayDivisorPerson` INTEGER NULL,
  ADD COLUMN `displayText` TEXT NULL;
