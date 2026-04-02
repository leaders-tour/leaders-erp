-- Add preset-code filters for external transfer pricing rules.
ALTER TABLE `PricingRule`
  ADD COLUMN `externalTransferPresetCodes` JSON NULL;
