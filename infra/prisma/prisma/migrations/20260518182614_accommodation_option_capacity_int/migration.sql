-- Convert AccommodationOption.capacity from free text to an integer room capacity.
-- Existing values such as "1인실" or "2~3인실" keep the first numeric token; non-numeric values become NULL.

ALTER TABLE `AccommodationOption`
  ADD COLUMN `capacity_int` INTEGER NULL;

UPDATE `AccommodationOption`
SET `capacity_int` = CAST(REGEXP_SUBSTR(`capacity`, '[0-9]+') AS UNSIGNED)
WHERE `capacity` IS NOT NULL
  AND REGEXP_SUBSTR(`capacity`, '[0-9]+') IS NOT NULL;

ALTER TABLE `AccommodationOption`
  DROP COLUMN `capacity`;

ALTER TABLE `AccommodationOption`
  CHANGE COLUMN `capacity_int` `capacity` INTEGER NULL;
