-- Remove safety notice concept and internal movement distance fields.

DROP TABLE `location_version_safety_notice`;
DROP TABLE `safety_notice`;

ALTER TABLE `Location`
  DROP COLUMN `internalMovementDistance`;

ALTER TABLE `LocationVersion`
  DROP COLUMN `internalMovementDistance`;
