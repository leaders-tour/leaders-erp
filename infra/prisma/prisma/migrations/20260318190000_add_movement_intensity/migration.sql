ALTER TABLE `OvernightStayDay`
  ADD COLUMN `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NULL;

UPDATE `OvernightStayDay`
SET `movementIntensity` = CASE
  WHEN `averageTravelHours` <= 3 THEN 'LEVEL_1'
  WHEN `averageTravelHours` <= 5 THEN 'LEVEL_2'
  WHEN `averageTravelHours` <= 7 THEN 'LEVEL_3'
  WHEN `averageTravelHours` <= 9 THEN 'LEVEL_4'
  ELSE 'LEVEL_5'
END;

ALTER TABLE `OvernightStayDay`
  MODIFY `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NOT NULL;

ALTER TABLE `OvernightStayConnection`
  ADD COLUMN `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NULL;

UPDATE `OvernightStayConnection`
SET `movementIntensity` = CASE
  WHEN `averageTravelHours` <= 3 THEN 'LEVEL_1'
  WHEN `averageTravelHours` <= 5 THEN 'LEVEL_2'
  WHEN `averageTravelHours` <= 7 THEN 'LEVEL_3'
  WHEN `averageTravelHours` <= 9 THEN 'LEVEL_4'
  ELSE 'LEVEL_5'
END;

ALTER TABLE `OvernightStayConnection`
  MODIFY `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NOT NULL;

ALTER TABLE `OvernightStayConnectionVersion`
  ADD COLUMN `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NULL;

UPDATE `OvernightStayConnectionVersion`
SET `movementIntensity` = CASE
  WHEN `averageTravelHours` <= 3 THEN 'LEVEL_1'
  WHEN `averageTravelHours` <= 5 THEN 'LEVEL_2'
  WHEN `averageTravelHours` <= 7 THEN 'LEVEL_3'
  WHEN `averageTravelHours` <= 9 THEN 'LEVEL_4'
  ELSE 'LEVEL_5'
END;

ALTER TABLE `OvernightStayConnectionVersion`
  MODIFY `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NOT NULL;

ALTER TABLE `Segment`
  ADD COLUMN `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NULL;

UPDATE `Segment`
SET `movementIntensity` = CASE
  WHEN `averageTravelHours` <= 3 THEN 'LEVEL_1'
  WHEN `averageTravelHours` <= 5 THEN 'LEVEL_2'
  WHEN `averageTravelHours` <= 7 THEN 'LEVEL_3'
  WHEN `averageTravelHours` <= 9 THEN 'LEVEL_4'
  ELSE 'LEVEL_5'
END;

ALTER TABLE `Segment`
  MODIFY `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NOT NULL;

ALTER TABLE `SegmentVersion`
  ADD COLUMN `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NULL;

UPDATE `SegmentVersion`
SET `movementIntensity` = CASE
  WHEN `averageTravelHours` <= 3 THEN 'LEVEL_1'
  WHEN `averageTravelHours` <= 5 THEN 'LEVEL_2'
  WHEN `averageTravelHours` <= 7 THEN 'LEVEL_3'
  WHEN `averageTravelHours` <= 9 THEN 'LEVEL_4'
  ELSE 'LEVEL_5'
END;

ALTER TABLE `SegmentVersion`
  MODIFY `movementIntensity` ENUM('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5') NOT NULL;
