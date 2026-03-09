-- Expand enum to include new values and migrate legacy value.
ALTER TABLE `PlanVersion`
  MODIFY COLUMN `variantType` ENUM('basic', 'early', 'afternoon', 'extend', 'earlyNight', 'earlyMorning', 'earlyNightExtend', 'earlyMorningExtend') NOT NULL;

UPDATE `PlanVersion`
SET `variantType` = 'earlyMorning'
WHERE `variantType` = 'early';

ALTER TABLE `PlanVersion`
  MODIFY COLUMN `variantType` ENUM('basic', 'afternoon', 'extend', 'earlyNight', 'earlyMorning', 'earlyNightExtend', 'earlyMorningExtend') NOT NULL;

-- Add extra lodging input snapshot to plan version metadata.
ALTER TABLE `PlanVersionMeta`
  ADD COLUMN `extraLodgings` JSON NULL;

UPDATE `PlanVersionMeta`
SET `extraLodgings` = JSON_ARRAY()
WHERE `extraLodgings` IS NULL;

ALTER TABLE `PlanVersionMeta`
  MODIFY COLUMN `extraLodgings` JSON NOT NULL;

-- Create pricing policy/rule master tables.
CREATE TABLE `PricingPolicy` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effectiveFrom` DATETIME(3) NOT NULL,
  `effectiveTo` DATETIME(3) NULL,
  `priority` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PricingPolicy_code_key`(`code`),
  INDEX `PricingPolicy_status_effectiveFrom_effectiveTo_idx`(`status`, `effectiveFrom`, `effectiveTo`),
  INDEX `PricingPolicy_priority_idx`(`priority`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PricingRule` (
  `id` VARCHAR(191) NOT NULL,
  `policyId` VARCHAR(191) NOT NULL,
  `lineCode` ENUM('BASE', 'BASE_UPLIFT_5PLUS', 'LONG_DISTANCE', 'HIACE', 'EXTRA_LODGING', 'EARLY_NIGHT', 'EARLY_MORNING', 'EXTEND', 'MANUAL_ADJUSTMENT') NOT NULL,
  `calcType` ENUM('AMOUNT', 'PERCENT_OF_LINE') NOT NULL,
  `targetLineCode` ENUM('BASE', 'BASE_UPLIFT_5PLUS', 'LONG_DISTANCE', 'HIACE', 'EXTRA_LODGING', 'EARLY_NIGHT', 'EARLY_MORNING', 'EXTEND', 'MANUAL_ADJUSTMENT') NULL,
  `amountKrw` INTEGER NULL,
  `percentBps` INTEGER NULL,
  `quantitySource` ENUM('ONE', 'TOTAL_DAYS', 'LONG_DISTANCE_SEGMENT_COUNT', 'SUM_EXTRA_LODGING_COUNTS') NOT NULL,
  `headcountMin` INTEGER NULL,
  `headcountMax` INTEGER NULL,
  `dayMin` INTEGER NULL,
  `dayMax` INTEGER NULL,
  `vehicleType` VARCHAR(191) NULL,
  `variantTypes` JSON NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `PricingRule_policyId_lineCode_isEnabled_sortOrder_idx`(`policyId`, `lineCode`, `isEnabled`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlanVersionPricing` (
  `id` VARCHAR(191) NOT NULL,
  `planVersionId` VARCHAR(191) NOT NULL,
  `policyId` VARCHAR(191) NOT NULL,
  `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'KRW',
  `baseAmountKrw` INTEGER NOT NULL,
  `addonAmountKrw` INTEGER NOT NULL,
  `totalAmountKrw` INTEGER NOT NULL,
  `inputSnapshot` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PlanVersionPricing_planVersionId_key`(`planVersionId`),
  INDEX `PlanVersionPricing_policyId_idx`(`policyId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlanVersionPricingLine` (
  `id` VARCHAR(191) NOT NULL,
  `planVersionPricingId` VARCHAR(191) NOT NULL,
  `lineCode` ENUM('BASE', 'BASE_UPLIFT_5PLUS', 'LONG_DISTANCE', 'HIACE', 'EXTRA_LODGING', 'EARLY_NIGHT', 'EARLY_MORNING', 'EXTEND', 'MANUAL_ADJUSTMENT') NOT NULL,
  `sourceType` ENUM('RULE', 'MANUAL') NOT NULL,
  `ruleId` VARCHAR(191) NULL,
  `description` VARCHAR(191) NULL,
  `unitPriceKrw` INTEGER NULL,
  `quantity` INTEGER NOT NULL,
  `amountKrw` INTEGER NOT NULL,
  `meta` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `PlanVersionPricingLine_planVersionPricingId_idx`(`planVersionPricingId`),
  INDEX `PlanVersionPricingLine_ruleId_idx`(`ruleId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PricingRule`
  ADD CONSTRAINT `PricingRule_policyId_fkey`
  FOREIGN KEY (`policyId`) REFERENCES `PricingPolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlanVersionPricing`
  ADD CONSTRAINT `PlanVersionPricing_planVersionId_fkey`
  FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlanVersionPricing`
  ADD CONSTRAINT `PlanVersionPricing_policyId_fkey`
  FOREIGN KEY (`policyId`) REFERENCES `PricingPolicy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PlanVersionPricingLine`
  ADD CONSTRAINT `PlanVersionPricingLine_planVersionPricingId_fkey`
  FOREIGN KEY (`planVersionPricingId`) REFERENCES `PlanVersionPricing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlanVersionPricingLine`
  ADD CONSTRAINT `PlanVersionPricingLine_ruleId_fkey`
  FOREIGN KEY (`ruleId`) REFERENCES `PricingRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default policy.
INSERT INTO `PricingPolicy` (`id`, `code`, `name`, `status`, `effectiveFrom`, `effectiveTo`, `priority`, `updatedAt`)
VALUES
  ('policy_default_2026', 'DEFAULT_2026', '2026 기본 요율', 'ACTIVE', '2026-01-01 00:00:00.000', NULL, 100, NOW(3));

-- BASE rules (headcount rate, multiplied by total days).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_base_2', 'policy_default_2026', 'BASE', 'AMOUNT', NULL, 345000, NULL, 'TOTAL_DAYS', 2, 2, NULL, NULL, NULL, NULL, true, 100, NOW(3)),
  ('rule_base_3', 'policy_default_2026', 'BASE', 'AMOUNT', NULL, 258000, NULL, 'TOTAL_DAYS', 3, 3, NULL, NULL, NULL, NULL, true, 110, NOW(3)),
  ('rule_base_4', 'policy_default_2026', 'BASE', 'AMOUNT', NULL, 223000, NULL, 'TOTAL_DAYS', 4, 4, NULL, NULL, NULL, NULL, true, 120, NOW(3)),
  ('rule_base_5', 'policy_default_2026', 'BASE', 'AMOUNT', NULL, 180000, NULL, 'TOTAL_DAYS', 5, 5, NULL, NULL, NULL, NULL, true, 130, NOW(3)),
  ('rule_base_6_7', 'policy_default_2026', 'BASE', 'AMOUNT', NULL, 160000, NULL, 'TOTAL_DAYS', 6, 7, NULL, NULL, NULL, NULL, true, 140, NOW(3)),
  ('rule_base_8_plus', 'policy_default_2026', 'BASE', 'AMOUNT', NULL, 155000, NULL, 'TOTAL_DAYS', 8, NULL, NULL, NULL, NULL, NULL, true, 150, NOW(3));

-- BASE uplift rules for 5+ headcount.
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_base_uplift_5days', 'policy_default_2026', 'BASE_UPLIFT_5PLUS', 'PERCENT_OF_LINE', 'BASE', NULL, 500, 'ONE', 5, NULL, NULL, 5, NULL, NULL, true, 200, NOW(3)),
  ('rule_base_uplift_6days', 'policy_default_2026', 'BASE_UPLIFT_5PLUS', 'PERCENT_OF_LINE', 'BASE', NULL, 1000, 'ONE', 5, NULL, 6, NULL, NULL, NULL, true, 210, NOW(3));

-- LONG_DISTANCE rules (group amount multiplied by long-distance segment count).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_long_2', 'policy_default_2026', 'LONG_DISTANCE', 'AMOUNT', NULL, 150000, NULL, 'LONG_DISTANCE_SEGMENT_COUNT', 2, 2, NULL, NULL, NULL, NULL, true, 300, NOW(3)),
  ('rule_long_3', 'policy_default_2026', 'LONG_DISTANCE', 'AMOUNT', NULL, 100000, NULL, 'LONG_DISTANCE_SEGMENT_COUNT', 3, 3, NULL, NULL, NULL, NULL, true, 310, NOW(3)),
  ('rule_long_4', 'policy_default_2026', 'LONG_DISTANCE', 'AMOUNT', NULL, 75000, NULL, 'LONG_DISTANCE_SEGMENT_COUNT', 4, 4, NULL, NULL, NULL, NULL, true, 320, NOW(3)),
  ('rule_long_5', 'policy_default_2026', 'LONG_DISTANCE', 'AMOUNT', NULL, 63000, NULL, 'LONG_DISTANCE_SEGMENT_COUNT', 5, 5, NULL, NULL, NULL, NULL, true, 330, NOW(3)),
  ('rule_long_6_7', 'policy_default_2026', 'LONG_DISTANCE', 'AMOUNT', NULL, 53000, NULL, 'LONG_DISTANCE_SEGMENT_COUNT', 6, 7, NULL, NULL, NULL, NULL, true, 340, NOW(3)),
  ('rule_long_8_plus', 'policy_default_2026', 'LONG_DISTANCE', 'AMOUNT', NULL, 42000, NULL, 'LONG_DISTANCE_SEGMENT_COUNT', 8, NULL, NULL, NULL, NULL, NULL, true, 350, NOW(3));

-- HIACE rules (rate by headcount, multiplied by total days).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_hiace_3', 'policy_default_2026', 'HIACE', 'AMOUNT', NULL, 10000, NULL, 'TOTAL_DAYS', 3, 3, NULL, NULL, '하이에이스', NULL, true, 400, NOW(3)),
  ('rule_hiace_4', 'policy_default_2026', 'HIACE', 'AMOUNT', NULL, 7500, NULL, 'TOTAL_DAYS', 4, 4, NULL, NULL, '하이에이스', NULL, true, 410, NOW(3)),
  ('rule_hiace_5', 'policy_default_2026', 'HIACE', 'AMOUNT', NULL, 6000, NULL, 'TOTAL_DAYS', 5, 5, NULL, NULL, '하이에이스', NULL, true, 420, NOW(3)),
  ('rule_hiace_6', 'policy_default_2026', 'HIACE', 'AMOUNT', NULL, 5000, NULL, 'TOTAL_DAYS', 6, 6, NULL, NULL, '하이에이스', NULL, true, 430, NOW(3));

-- EXTRA_LODGING rules (rate by headcount, multiplied by sum(extra lodging counts)).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_lodging_2', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 100000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 2, 2, NULL, NULL, NULL, NULL, true, 500, NOW(3)),
  ('rule_lodging_3', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 67000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 3, 3, NULL, NULL, NULL, NULL, true, 510, NOW(3)),
  ('rule_lodging_4', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 50000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 4, 4, NULL, NULL, NULL, NULL, true, 520, NOW(3)),
  ('rule_lodging_5', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 40000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 5, 5, NULL, NULL, NULL, NULL, true, 530, NOW(3)),
  ('rule_lodging_6', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 34000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 6, 6, NULL, NULL, NULL, NULL, true, 540, NOW(3)),
  ('rule_lodging_7', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 29000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 7, 7, NULL, NULL, NULL, NULL, true, 550, NOW(3)),
  ('rule_lodging_8_plus', 'policy_default_2026', 'EXTRA_LODGING', 'AMOUNT', NULL, 25000, NULL, 'SUM_EXTRA_LODGING_COUNTS', 8, NULL, NULL, NULL, NULL, NULL, true, 560, NOW(3));

-- EARLY_NIGHT rules (trip fixed surcharge by headcount).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_early_night_2', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 240000, NULL, 'ONE', 2, 2, NULL, NULL, NULL, NULL, true, 600, NOW(3)),
  ('rule_early_night_3', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 160000, NULL, 'ONE', 3, 3, NULL, NULL, NULL, NULL, true, 610, NOW(3)),
  ('rule_early_night_4', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 120000, NULL, 'ONE', 4, 4, NULL, NULL, NULL, NULL, true, 620, NOW(3)),
  ('rule_early_night_5', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 96000, NULL, 'ONE', 5, 5, NULL, NULL, NULL, NULL, true, 630, NOW(3)),
  ('rule_early_night_6', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 80000, NULL, 'ONE', 6, 6, NULL, NULL, NULL, NULL, true, 640, NOW(3)),
  ('rule_early_night_7', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 70000, NULL, 'ONE', 7, 7, NULL, NULL, NULL, NULL, true, 650, NOW(3)),
  ('rule_early_night_8_plus', 'policy_default_2026', 'EARLY_NIGHT', 'AMOUNT', NULL, 60000, NULL, 'ONE', 8, NULL, NULL, NULL, NULL, NULL, true, 660, NOW(3));

-- EARLY_MORNING rules (trip fixed surcharge by headcount).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_early_morning_2', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 120000, NULL, 'ONE', 2, 2, NULL, NULL, NULL, NULL, true, 700, NOW(3)),
  ('rule_early_morning_3', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 80000, NULL, 'ONE', 3, 3, NULL, NULL, NULL, NULL, true, 710, NOW(3)),
  ('rule_early_morning_4', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 60000, NULL, 'ONE', 4, 4, NULL, NULL, NULL, NULL, true, 720, NOW(3)),
  ('rule_early_morning_5', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 48000, NULL, 'ONE', 5, 5, NULL, NULL, NULL, NULL, true, 730, NOW(3)),
  ('rule_early_morning_6', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 40000, NULL, 'ONE', 6, 6, NULL, NULL, NULL, NULL, true, 740, NOW(3)),
  ('rule_early_morning_7', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 35000, NULL, 'ONE', 7, 7, NULL, NULL, NULL, NULL, true, 750, NOW(3)),
  ('rule_early_morning_8_plus', 'policy_default_2026', 'EARLY_MORNING', 'AMOUNT', NULL, 30000, NULL, 'ONE', 8, NULL, NULL, NULL, NULL, NULL, true, 760, NOW(3));

-- EXTEND rules (trip fixed surcharge by headcount).
INSERT INTO `PricingRule` (
  `id`, `policyId`, `lineCode`, `calcType`, `targetLineCode`, `amountKrw`, `percentBps`, `quantitySource`,
  `headcountMin`, `headcountMax`, `dayMin`, `dayMax`, `vehicleType`, `variantTypes`, `isEnabled`, `sortOrder`, `updatedAt`
)
VALUES
  ('rule_extend_2', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 120000, NULL, 'ONE', 2, 2, NULL, NULL, NULL, NULL, true, 800, NOW(3)),
  ('rule_extend_3', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 80000, NULL, 'ONE', 3, 3, NULL, NULL, NULL, NULL, true, 810, NOW(3)),
  ('rule_extend_4', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 60000, NULL, 'ONE', 4, 4, NULL, NULL, NULL, NULL, true, 820, NOW(3)),
  ('rule_extend_5', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 48000, NULL, 'ONE', 5, 5, NULL, NULL, NULL, NULL, true, 830, NOW(3)),
  ('rule_extend_6', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 40000, NULL, 'ONE', 6, 6, NULL, NULL, NULL, NULL, true, 840, NOW(3)),
  ('rule_extend_7', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 35000, NULL, 'ONE', 7, 7, NULL, NULL, NULL, NULL, true, 850, NOW(3)),
  ('rule_extend_8_plus', 'policy_default_2026', 'EXTEND', 'AMOUNT', NULL, 30000, NULL, 'ONE', 8, NULL, NULL, NULL, NULL, NULL, true, 860, NOW(3));
