ALTER TABLE `PricingRule`
  MODIFY `lineCode` ENUM(
    'BASE',
    'BASE_PERCENT',
    'BASE_UPLIFT_5PLUS_5PCT',
    'BASE_UPLIFT_5PLUS_10PCT',
    'LONG_DISTANCE',
    'NIGHT_TRAIN',
    'PICKUP_DROP',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'CONDITIONAL',
    'HIACE',
    'EARLY',
    'EXTEND',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL,
  ADD COLUMN `priceItemPreset` ENUM(
    'BASE',
    'BASE_PERCENT',
    'LONG_DISTANCE',
    'NIGHT_TRAIN',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'PICKUP_DROP',
    'CONDITIONAL',
    'MANUAL_PRESET'
  ) NULL AFTER `policyId`;

UPDATE `PricingRule`
SET
  `variantTypes` = JSON_ARRAY('early', 'earlyExtend')
WHERE `lineCode` = 'EARLY'
  AND (`variantTypes` IS NULL OR JSON_LENGTH(`variantTypes`) = 0);

UPDATE `PricingRule`
SET
  `variantTypes` = JSON_ARRAY('extend', 'earlyExtend')
WHERE `lineCode` = 'EXTEND'
  AND (`variantTypes` IS NULL OR JSON_LENGTH(`variantTypes`) = 0);

UPDATE `PricingRule`
SET
  `vehicleType` = '하이에이스',
  `headcountMin` = COALESCE(`headcountMin`, 3),
  `headcountMax` = COALESCE(`headcountMax`, 6)
WHERE `lineCode` = 'HIACE'
  AND `vehicleType` IS NULL;

UPDATE `PricingRule`
SET `lineCode` = 'BASE_PERCENT'
WHERE `lineCode` IN ('BASE_UPLIFT_5PLUS_5PCT', 'BASE_UPLIFT_5PLUS_10PCT');

UPDATE `PricingRule`
SET `lineCode` = 'CONDITIONAL'
WHERE `lineCode` IN ('HIACE', 'EARLY', 'EXTEND');

UPDATE `PricingRule`
SET `lineCode` = 'PICKUP_DROP'
WHERE `lineCode` = 'MANUAL_ADJUSTMENT'
  AND (
    `pickupPlaceType` IS NOT NULL
    OR `dropPlaceType` IS NOT NULL
    OR `externalTransferMode` IS NOT NULL
    OR `externalTransferMinCount` IS NOT NULL
    OR JSON_LENGTH(`externalTransferPresetCodes`) > 0
  );

UPDATE `PricingRule`
SET `priceItemPreset` = CASE
  WHEN `lineCode` = 'BASE' THEN 'BASE'
  WHEN `lineCode` = 'BASE_PERCENT' THEN 'BASE_PERCENT'
  WHEN `lineCode` = 'LONG_DISTANCE' THEN 'LONG_DISTANCE'
  WHEN `lineCode` = 'NIGHT_TRAIN' THEN 'NIGHT_TRAIN'
  WHEN `lineCode` = 'EXTRA_LODGING' THEN 'EXTRA_LODGING'
  WHEN `lineCode` = 'LODGING_SELECTION' THEN 'LODGING_SELECTION'
  WHEN `lineCode` = 'PICKUP_DROP' THEN 'PICKUP_DROP'
  WHEN `lineCode` = 'MANUAL_ADJUSTMENT' AND `ruleType` = 'MANUAL' THEN 'MANUAL_PRESET'
  ELSE 'CONDITIONAL'
END;

ALTER TABLE `PricingRule`
  MODIFY `priceItemPreset` ENUM(
    'BASE',
    'BASE_PERCENT',
    'LONG_DISTANCE',
    'NIGHT_TRAIN',
    'EXTRA_LODGING',
    'LODGING_SELECTION',
    'PICKUP_DROP',
    'CONDITIONAL',
    'MANUAL_PRESET'
  ) NOT NULL;
