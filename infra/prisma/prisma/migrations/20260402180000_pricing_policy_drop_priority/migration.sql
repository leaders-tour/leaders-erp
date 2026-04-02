-- Drop pricing policy priority (no longer used; active periods must not overlap).
ALTER TABLE `PricingPolicy` DROP COLUMN `priority`;
