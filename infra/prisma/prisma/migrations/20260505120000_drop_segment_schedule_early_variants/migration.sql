-- Drop early / earlyExtend rows (activities cascade on time block delete).
DELETE FROM `OvernightStayConnectionVersionTimeBlock` WHERE `variant` IN ('early', 'earlyExtend');
DELETE FROM `OvernightStayConnectionTimeBlock` WHERE `variant` IN ('early', 'earlyExtend');
DELETE FROM `SegmentVersionTimeBlock` WHERE `variant` IN ('early', 'earlyExtend');
DELETE FROM `SegmentTimeBlock` WHERE `variant` IN ('early', 'earlyExtend');

-- SegmentScheduleVariant: keep basic + extend only
ALTER TABLE `SegmentTimeBlock`
    MODIFY COLUMN `variant` ENUM('basic', 'extend') NOT NULL DEFAULT 'basic';

ALTER TABLE `SegmentVersionTimeBlock`
    MODIFY COLUMN `variant` ENUM('basic', 'extend') NOT NULL DEFAULT 'basic';

ALTER TABLE `OvernightStayConnectionTimeBlock`
    MODIFY COLUMN `variant` ENUM('basic', 'extend') NOT NULL DEFAULT 'basic';

ALTER TABLE `OvernightStayConnectionVersionTimeBlock`
    MODIFY COLUMN `variant` ENUM('basic', 'extend') NOT NULL DEFAULT 'basic';
