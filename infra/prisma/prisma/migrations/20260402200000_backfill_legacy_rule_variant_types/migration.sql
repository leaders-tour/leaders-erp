-- Backfill legacy EARLY/EXTEND rules so admin UI and engine share the same variant semantics.
UPDATE `PricingRule`
SET `variantTypes` = JSON_ARRAY('Early', 'EarlyExtend')
WHERE `lineCode` = 'EARLY';

UPDATE `PricingRule`
SET `variantTypes` = JSON_ARRAY('Extend', 'EarlyExtend')
WHERE `lineCode` = 'EXTEND';
