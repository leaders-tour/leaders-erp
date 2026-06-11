ALTER TABLE `PlanStop`
  ADD COLUMN `movementIntensityColorOverride` VARCHAR(7) NULL;

ALTER TABLE `PlanVersionMeta`
  DROP COLUMN `movementIntensityColors`;
