-- Normalize pricing rule variantTypes to the actual VariantType enum values used by GraphQL/Prisma.
UPDATE `PricingRule`
SET `variantTypes` = JSON_ARRAY('early', 'earlyExtend')
WHERE `lineCode` = 'EARLY';

UPDATE `PricingRule`
SET `variantTypes` = JSON_ARRAY('extend', 'earlyExtend')
WHERE `lineCode` = 'EXTEND';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[0]', 'basic')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[0]')) = 'Basic';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[0]', 'early')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[0]')) = 'Early';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[0]', 'extend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[0]')) = 'Extend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[0]', 'earlyExtend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[0]')) = 'EarlyExtend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[1]', 'basic')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[1]')) = 'Basic';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[1]', 'early')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[1]')) = 'Early';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[1]', 'extend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[1]')) = 'Extend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[1]', 'earlyExtend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[1]')) = 'EarlyExtend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[2]', 'basic')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[2]')) = 'Basic';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[2]', 'early')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[2]')) = 'Early';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[2]', 'extend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[2]')) = 'Extend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[2]', 'earlyExtend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[2]')) = 'EarlyExtend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[3]', 'basic')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[3]')) = 'Basic';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[3]', 'early')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[3]')) = 'Early';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[3]', 'extend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[3]')) = 'Extend';

UPDATE `PricingRule`
SET `variantTypes` = JSON_REPLACE(`variantTypes`, '$[3]', 'earlyExtend')
WHERE JSON_TYPE(`variantTypes`) = 'ARRAY' AND JSON_UNQUOTE(JSON_EXTRACT(`variantTypes`, '$[3]')) = 'EarlyExtend';
