-- Add temp JSON columns for multiline location names
ALTER TABLE `Location`
    ADD COLUMN `name_json` JSON NULL;

ALTER TABLE `LocationVersion`
    ADD COLUMN `locationNameSnapshot_json` JSON NULL;

ALTER TABLE `Lodging`
    ADD COLUMN `locationNameSnapshot_json` JSON NULL;

ALTER TABLE `MealSet`
    ADD COLUMN `locationNameSnapshot_json` JSON NULL;

-- Backfill legacy string names into JSON arrays
UPDATE `Location`
SET `name_json` = JSON_ARRAY(`name`);

UPDATE `LocationVersion`
SET `locationNameSnapshot_json` = JSON_ARRAY(`locationNameSnapshot`);

UPDATE `Lodging`
SET `locationNameSnapshot_json` = JSON_ARRAY(`locationNameSnapshot`);

UPDATE `MealSet`
SET `locationNameSnapshot_json` = JSON_ARRAY(`locationNameSnapshot`);

-- Repoint plan stops that referenced VIA segment versions
UPDATE `PlanStop` AS `ps`
INNER JOIN `SegmentVersion` AS `sv` ON `ps`.`segmentVersionId` = `sv`.`id`
LEFT JOIN `Segment` AS `s` ON `sv`.`segmentId` = `s`.`id`
SET `ps`.`segmentVersionId` = `s`.`defaultVersionId`
WHERE `sv`.`kind` = 'VIA';

UPDATE `PlanTemplateStop` AS `pts`
INNER JOIN `SegmentVersion` AS `sv` ON `pts`.`segmentVersionId` = `sv`.`id`
LEFT JOIN `Segment` AS `s` ON `sv`.`segmentId` = `s`.`id`
SET `pts`.`segmentVersionId` = `s`.`defaultVersionId`
WHERE `sv`.`kind` = 'VIA';

-- Remove VIA-only rows before dropping the table/column
DELETE `svvl`
FROM `SegmentVersionViaLocation` AS `svvl`
INNER JOIN `SegmentVersion` AS `sv` ON `svvl`.`segmentVersionId` = `sv`.`id`
WHERE `sv`.`kind` = 'VIA';

DELETE FROM `SegmentVersion`
WHERE `kind` = 'VIA';

DROP TABLE `SegmentVersionViaLocation`;

-- Finalize JSON name columns
ALTER TABLE `Location`
    DROP COLUMN `name`,
    CHANGE COLUMN `name_json` `name` JSON NOT NULL;

ALTER TABLE `LocationVersion`
    DROP COLUMN `locationNameSnapshot`,
    CHANGE COLUMN `locationNameSnapshot_json` `locationNameSnapshot` JSON NOT NULL;

ALTER TABLE `Lodging`
    DROP COLUMN `locationNameSnapshot`,
    CHANGE COLUMN `locationNameSnapshot_json` `locationNameSnapshot` JSON NOT NULL;

ALTER TABLE `MealSet`
    DROP COLUMN `locationNameSnapshot`,
    CHANGE COLUMN `locationNameSnapshot_json` `locationNameSnapshot` JSON NOT NULL;

-- Remove VIA discriminator
ALTER TABLE `SegmentVersion`
    DROP COLUMN `kind`;
