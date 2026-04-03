ALTER TABLE `PricingRule`
  ADD COLUMN `lodgingSelectionLevel` ENUM('LV1', 'LV2', 'LV4') NULL AFTER `quantitySource`;

INSERT INTO `PricingRule` (
  `id`,
  `policyId`,
  `ruleType`,
  `title`,
  `lineCode`,
  `calcType`,
  `amountKrw`,
  `quantitySource`,
  `lodgingSelectionLevel`,
  `chargeScope`,
  `personMode`,
  `isEnabled`,
  `sortOrder`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  `p`.`id`,
  'CONDITIONAL_ADDON',
  '숙소 할인 (LV1)',
  'LODGING_SELECTION',
  'AMOUNT',
  -50000,
  'ONE',
  'LV1',
  'PER_PERSON',
  'PER_NIGHT',
  TRUE,
  900,
  NOW(),
  NOW()
FROM `PricingPolicy` `p`
WHERE NOT EXISTS (
  SELECT 1
  FROM `PricingRule` `r`
  WHERE `r`.`policyId` = `p`.`id`
    AND `r`.`lineCode` = 'LODGING_SELECTION'
    AND `r`.`lodgingSelectionLevel` = 'LV1'
);

INSERT INTO `PricingRule` (
  `id`,
  `policyId`,
  `ruleType`,
  `title`,
  `lineCode`,
  `calcType`,
  `amountKrw`,
  `quantitySource`,
  `lodgingSelectionLevel`,
  `chargeScope`,
  `personMode`,
  `isEnabled`,
  `sortOrder`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  `p`.`id`,
  'CONDITIONAL_ADDON',
  '숙소 할인 (LV2)',
  'LODGING_SELECTION',
  'AMOUNT',
  -30000,
  'ONE',
  'LV2',
  'PER_PERSON',
  'PER_NIGHT',
  TRUE,
  901,
  NOW(),
  NOW()
FROM `PricingPolicy` `p`
WHERE NOT EXISTS (
  SELECT 1
  FROM `PricingRule` `r`
  WHERE `r`.`policyId` = `p`.`id`
    AND `r`.`lineCode` = 'LODGING_SELECTION'
    AND `r`.`lodgingSelectionLevel` = 'LV2'
);

INSERT INTO `PricingRule` (
  `id`,
  `policyId`,
  `ruleType`,
  `title`,
  `lineCode`,
  `calcType`,
  `amountKrw`,
  `quantitySource`,
  `lodgingSelectionLevel`,
  `chargeScope`,
  `personMode`,
  `isEnabled`,
  `sortOrder`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  `p`.`id`,
  'CONDITIONAL_ADDON',
  '숙소 업그레이드 (LV4)',
  'LODGING_SELECTION',
  'AMOUNT',
  50000,
  'ONE',
  'LV4',
  'PER_PERSON',
  'PER_NIGHT',
  TRUE,
  902,
  NOW(),
  NOW()
FROM `PricingPolicy` `p`
WHERE NOT EXISTS (
  SELECT 1
  FROM `PricingRule` `r`
  WHERE `r`.`policyId` = `p`.`id`
    AND `r`.`lineCode` = 'LODGING_SELECTION'
    AND `r`.`lodgingSelectionLevel` = 'LV4'
);
