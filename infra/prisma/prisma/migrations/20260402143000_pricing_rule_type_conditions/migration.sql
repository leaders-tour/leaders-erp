ALTER TABLE `PricingRule`
  ADD COLUMN `ruleType` ENUM('BASE', 'PERCENT_UPLIFT', 'CONDITIONAL_ADDON', 'AUTO_EXCEPTION', 'MANUAL') NOT NULL DEFAULT 'CONDITIONAL_ADDON',
  ADD COLUMN `title` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `travelDateFrom` DATETIME(3) NULL,
  ADD COLUMN `travelDateTo` DATETIME(3) NULL,
  ADD COLUMN `flightInTimeBand` ENUM('DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT') NULL,
  ADD COLUMN `flightOutTimeBand` ENUM('DAWN', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT') NULL,
  ADD COLUMN `pickupPlaceType` VARCHAR(50) NULL,
  ADD COLUMN `dropPlaceType` VARCHAR(50) NULL,
  ADD COLUMN `externalTransferMode` ENUM('ANY', 'PICKUP_ONLY', 'DROP_ONLY', 'BOTH') NULL,
  ADD COLUMN `externalTransferMinCount` INTEGER NULL;

UPDATE `PricingRule`
SET
  `ruleType` = CASE
    WHEN `lineCode` = 'BASE' THEN 'BASE'
    WHEN `lineCode` IN ('BASE_UPLIFT_5PLUS_5PCT', 'BASE_UPLIFT_5PLUS_10PCT') THEN 'PERCENT_UPLIFT'
    WHEN `lineCode` = 'LONG_DISTANCE' THEN 'AUTO_EXCEPTION'
    WHEN `lineCode` = 'MANUAL_ADJUSTMENT' THEN 'MANUAL'
    ELSE 'CONDITIONAL_ADDON'
  END,
  `title` = CASE
    WHEN `lineCode` = 'BASE' THEN '기본금'
    WHEN `lineCode` = 'BASE_UPLIFT_5PLUS_5PCT' THEN '기본금 5% 추가'
    WHEN `lineCode` = 'BASE_UPLIFT_5PLUS_10PCT' THEN '기본금 10% 추가'
    WHEN `lineCode` = 'LONG_DISTANCE' THEN '장거리 구간 합계'
    WHEN `lineCode` = 'HIACE' THEN '하이에이스 추가금'
    WHEN `lineCode` = 'EXTRA_LODGING' THEN '숙소 추가'
    WHEN `lineCode` = 'LODGING_SELECTION' THEN '숙소 업그레이드'
    WHEN `lineCode` = 'EARLY' THEN '얼리 추가금'
    WHEN `lineCode` = 'EXTEND' THEN '연장 추가금'
    WHEN `lineCode` = 'MANUAL_ADJUSTMENT' THEN '기타 금액'
    ELSE `lineCode`
  END;

ALTER TABLE `PlanVersionPricingLine`
  ADD COLUMN `ruleType` ENUM('BASE', 'PERCENT_UPLIFT', 'CONDITIONAL_ADDON', 'AUTO_EXCEPTION', 'MANUAL') NULL;
