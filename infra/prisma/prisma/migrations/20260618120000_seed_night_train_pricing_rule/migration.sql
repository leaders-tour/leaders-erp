INSERT INTO `PricingRule` (
  `id`,
  `policyId`,
  `priceItemPreset`,
  `ruleType`,
  `title`,
  `lineCode`,
  `calcType`,
  `amountKrw`,
  `quantitySource`,
  `chargeScope`,
  `personMode`,
  `isEnabled`,
  `sortOrder`,
  `createdAt`,
  `updatedAt`
)
SELECT
  'rule_night_train_default',
  `p`.`id`,
  'NIGHT_TRAIN',
  'CONDITIONAL_ADDON',
  '야간 열차',
  'NIGHT_TRAIN',
  'AMOUNT',
  420000,
  'NIGHT_TRAIN_BLOCK_COUNT',
  'TEAM',
  NULL,
  TRUE,
  570,
  NOW(3),
  NOW(3)
FROM `PricingPolicy` `p`
WHERE `p`.`code` = 'DEFAULT_2026'
  AND NOT EXISTS (
    SELECT 1
    FROM `PricingRule` `r`
    WHERE `r`.`policyId` = `p`.`id`
      AND `r`.`lineCode` = 'NIGHT_TRAIN'
  );
