-- Split BASE uplift line code into explicit 5% / 10% variants.

ALTER TABLE `PricingRule`
  MODIFY COLUMN `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL,
  MODIFY COLUMN `targetLineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NULL;

ALTER TABLE `PlanVersionPricingLine`
  MODIFY COLUMN `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL;

-- Migrate pricing rules.
UPDATE `PricingRule`
SET `lineCode` = 'BASE_UPLIFT_5PLUS_5PCT'
WHERE `lineCode` = 'BASE_UPLIFT_5PLUS'
  AND `calcType` = 'PERCENT_OF_LINE'
  AND (`percentBps` = 500 OR `dayMax` = 5);

UPDATE `PricingRule`
SET `lineCode` = 'BASE_UPLIFT_5PLUS_10PCT'
WHERE `lineCode` = 'BASE_UPLIFT_5PLUS'
  AND `calcType` = 'PERCENT_OF_LINE';

-- Migrate historical snapshot lines.
UPDATE `PlanVersionPricingLine`
SET `lineCode` = 'BASE_UPLIFT_5PLUS_5PCT'
WHERE `lineCode` = 'BASE_UPLIFT_5PLUS'
  AND (`ruleId` = 'rule_base_uplift_5days' OR JSON_EXTRACT(`meta`, '$.percentBps') = 500);

UPDATE `PlanVersionPricingLine`
SET `lineCode` = 'BASE_UPLIFT_5PLUS_10PCT'
WHERE `lineCode` = 'BASE_UPLIFT_5PLUS';

ALTER TABLE `PricingRule`
  MODIFY COLUMN `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL,
  MODIFY COLUMN `targetLineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NULL;

ALTER TABLE `PlanVersionPricingLine`
  MODIFY COLUMN `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL;
