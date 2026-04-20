-- Modify Driver.vehicleType ENUM to add HIACE_SHORT and HIACE_LONG
ALTER TABLE `Driver` MODIFY COLUMN `vehicleType` ENUM('STAREX','HIACE','HIACE_SHORT','HIACE_LONG','PURGON','LAND_CRUISER','ALPHARD','OTHER') NOT NULL DEFAULT 'OTHER';

-- Migrate existing Driver records: HIACE -> HIACE_SHORT
UPDATE `Driver` SET `vehicleType` = 'HIACE_SHORT' WHERE `vehicleType` = 'HIACE';

-- Migrate PlanVersionMeta.vehicleType (string field)
UPDATE `PlanVersionMeta` SET `vehicleType` = '하이에이스(숏)' WHERE `vehicleType` = '하이에이스';

-- Migrate PricingRule.vehicleType (string field)
UPDATE `PricingRule` SET `vehicleType` = '하이에이스(숏)' WHERE `vehicleType` = '하이에이스';
