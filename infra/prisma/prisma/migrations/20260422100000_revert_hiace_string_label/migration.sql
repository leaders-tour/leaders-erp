-- Revert PlanVersionMeta.vehicleType string labels back to '하이에이스'
UPDATE `PlanVersionMeta` SET `vehicleType` = '하이에이스'
  WHERE `vehicleType` IN ('하이에이스(숏)', '하이에이스(롱)');

-- Revert PricingRule.vehicleType string labels back to '하이에이스'
UPDATE `PricingRule` SET `vehicleType` = '하이에이스'
  WHERE `vehicleType` IN ('하이에이스(숏)', '하이에이스(롱)');
