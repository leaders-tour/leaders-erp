ALTER TABLE `PricingRule`
  MODIFY COLUMN `ruleType` ENUM(
    'BASE',
    'PERCENT_UPLIFT',
    'CONDITIONAL_ADDON',
    'LONG_DISTANCE',
    'AUTO_EXCEPTION',
    'MANUAL'
  ) NOT NULL;

ALTER TABLE `PlanVersionPricingLine`
  MODIFY COLUMN `ruleType` ENUM(
    'BASE',
    'PERCENT_UPLIFT',
    'CONDITIONAL_ADDON',
    'LONG_DISTANCE',
    'AUTO_EXCEPTION',
    'MANUAL'
  ) NULL;

UPDATE `PricingRule`
SET
  `ruleType` = 'LONG_DISTANCE',
  `quantitySource` = 'LONG_DISTANCE_SEGMENT_COUNT'
WHERE `lineCode` = 'LONG_DISTANCE'
  AND (`ruleType` = 'CONDITIONAL_ADDON' OR `ruleType` = 'AUTO_EXCEPTION');

UPDATE `PlanVersionPricingLine`
SET `ruleType` = 'LONG_DISTANCE'
WHERE `lineCode` = 'LONG_DISTANCE'
  AND (`ruleType` = 'CONDITIONAL_ADDON' OR `ruleType` = 'AUTO_EXCEPTION');
