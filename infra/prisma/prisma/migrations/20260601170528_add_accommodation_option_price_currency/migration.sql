ALTER TABLE `AccommodationOption`
  ADD COLUMN `priceCurrencyCode` ENUM('MNT', 'USD') NOT NULL DEFAULT 'MNT' AFTER `pricePeakSeason`;
