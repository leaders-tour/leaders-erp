ALTER TABLE `OvernightStayDay`
  ADD COLUMN `movementIntensityColorOverride` VARCHAR(7) NULL;

ALTER TABLE `OvernightStayConnection`
  ADD COLUMN `movementIntensityColorOverride` VARCHAR(7) NULL;

ALTER TABLE `OvernightStayConnectionVersion`
  ADD COLUMN `movementIntensityColorOverride` VARCHAR(7) NULL;

ALTER TABLE `Segment`
  ADD COLUMN `movementIntensityColorOverride` VARCHAR(7) NULL;

ALTER TABLE `SegmentVersion`
  ADD COLUMN `movementIntensityColorOverride` VARCHAR(7) NULL;
