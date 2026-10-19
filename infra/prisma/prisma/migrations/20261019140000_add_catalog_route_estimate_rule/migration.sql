-- Catalog route expected-value rules and observation include overrides (ADD-only)

ALTER TABLE `CatalogRoute`
  ADD COLUMN `estimateMode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO',
  ADD COLUMN `bufferMinutes` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `CatalogRouteObservation`
  ADD COLUMN `manualIncludeOverride` BOOLEAN NOT NULL DEFAULT false;
