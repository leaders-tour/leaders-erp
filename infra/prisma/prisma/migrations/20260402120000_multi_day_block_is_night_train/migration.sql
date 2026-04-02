ALTER TABLE `OvernightStay`
    ADD COLUMN `isNightTrain` BOOLEAN NOT NULL DEFAULT false;

UPDATE `OvernightStay`
SET `isNightTrain` = CASE
    WHEN `blockType` = 'TRANSFER' THEN true
    ELSE false
END;
