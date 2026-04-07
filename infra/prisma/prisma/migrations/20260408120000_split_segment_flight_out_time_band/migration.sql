UPDATE `SegmentVersion`
SET `flightOutTimeBand` = NULL
WHERE `flightOutTimeBand` IS NOT NULL;

ALTER TABLE `SegmentVersion`
  MODIFY COLUMN `flightOutTimeBand` ENUM('EVENING_18_21') NULL;
