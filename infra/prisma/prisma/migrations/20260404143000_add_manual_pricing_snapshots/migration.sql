ALTER TABLE `PlanVersionPricing`
  ADD COLUMN `manualPricingSnapshot` JSON NULL,
  ADD COLUMN `originalPricingSnapshot` JSON NULL;
