ALTER TABLE `PlanVersion`
  MODIFY COLUMN `variantType` ENUM(
    'basic',
    'afternoon',
    'extend',
    'early',
    'earlyExtend',
    'earlyNight',
    'earlyMorning',
    'earlyNightExtend',
    'earlyMorningExtend'
  ) NOT NULL;

ALTER TABLE `PricingRule`
  MODIFY COLUMN `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'EARLY',
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
    'LODGING_SELECTION',
    'EARLY',
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
    'LODGING_SELECTION',
    'EARLY',
    'EARLY_NIGHT',
    'EARLY_MORNING',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL;

UPDATE `PlanVersion`
SET `variantType` = CASE
  WHEN `variantType` IN ('earlyNight', 'earlyMorning') THEN 'early'
  WHEN `variantType` IN ('earlyNightExtend', 'earlyMorningExtend') THEN 'earlyExtend'
  ELSE `variantType`
END
WHERE `variantType` IN ('earlyNight', 'earlyMorning', 'earlyNightExtend', 'earlyMorningExtend');

UPDATE `PricingRule`
SET `isEnabled` = false
WHERE `lineCode` = 'EARLY_NIGHT';

UPDATE `PricingRule`
SET
  `lineCode` = CASE
    WHEN `lineCode` IN ('EARLY_NIGHT', 'EARLY_MORNING') THEN 'EARLY'
    ELSE `lineCode`
  END,
  `targetLineCode` = CASE
    WHEN `targetLineCode` IN ('EARLY_NIGHT', 'EARLY_MORNING') THEN 'EARLY'
    ELSE `targetLineCode`
  END
WHERE `lineCode` IN ('EARLY_NIGHT', 'EARLY_MORNING')
   OR `targetLineCode` IN ('EARLY_NIGHT', 'EARLY_MORNING');

UPDATE `PlanVersionPricingLine`
SET `lineCode` = 'EARLY'
WHERE `lineCode` IN ('EARLY_NIGHT', 'EARLY_MORNING');

UPDATE `PricingRule`
SET `variantTypes` = CAST(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          CAST(`variantTypes` AS CHAR CHARACTER SET utf8mb4),
          '\"earlyNightExtend\"',
          '\"earlyExtend\"'
        ),
        '\"earlyMorningExtend\"',
        '\"earlyExtend\"'
      ),
      '\"earlyNight\"',
      '\"early\"'
    ),
    '\"earlyMorning\"',
    '\"early\"'
  ) AS JSON
)
WHERE `variantTypes` IS NOT NULL
  AND (
    JSON_SEARCH(`variantTypes`, 'one', 'earlyNight') IS NOT NULL
    OR JSON_SEARCH(`variantTypes`, 'one', 'earlyMorning') IS NOT NULL
    OR JSON_SEARCH(`variantTypes`, 'one', 'earlyNightExtend') IS NOT NULL
    OR JSON_SEARCH(`variantTypes`, 'one', 'earlyMorningExtend') IS NOT NULL
  );

UPDATE `PlanVersionPricing`
SET `inputSnapshot` = JSON_SET(
  `inputSnapshot`,
  '$.variantType',
  CASE JSON_UNQUOTE(JSON_EXTRACT(`inputSnapshot`, '$.variantType'))
    WHEN 'earlyNight' THEN 'early'
    WHEN 'earlyMorning' THEN 'early'
    WHEN 'earlyNightExtend' THEN 'earlyExtend'
    WHEN 'earlyMorningExtend' THEN 'earlyExtend'
    ELSE JSON_UNQUOTE(JSON_EXTRACT(`inputSnapshot`, '$.variantType'))
  END
)
WHERE JSON_UNQUOTE(JSON_EXTRACT(`inputSnapshot`, '$.variantType')) IN (
  'earlyNight',
  'earlyMorning',
  'earlyNightExtend',
  'earlyMorningExtend'
);

ALTER TABLE `PlanVersion`
  MODIFY COLUMN `variantType` ENUM(
    'basic',
    'afternoon',
    'extend',
    'early',
    'earlyExtend'
  ) NOT NULL;

ALTER TABLE `PricingRule`
  MODIFY COLUMN `lineCode` ENUM(
    'BASE',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'HIACE',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'EARLY',
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
    'LODGING_SELECTION',
    'EARLY',
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
    'LODGING_SELECTION',
    'EARLY',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL;
