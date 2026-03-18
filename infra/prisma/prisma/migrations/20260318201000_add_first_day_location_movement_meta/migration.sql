ALTER TABLE `LocationVersion`
  ADD COLUMN `firstDayAverageDistanceKm` DOUBLE NULL,
  ADD COLUMN `firstDayAverageTravelHours` DOUBLE NULL,
  ADD COLUMN `firstDayMovementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NULL;
