-- DropIndex
DROP INDEX `SegmentTimeBlock_segmentId_orderIndex_key` ON `SegmentTimeBlock`;

-- DropIndex
DROP INDEX `SegmentVersionTimeBlock_segmentVersionId_orderIndex_key` ON `SegmentVersionTimeBlock`;

-- DropIndex
DROP INDEX `TimeBlock_locationVersionId_orderIndex_key` ON `TimeBlock`;

-- AlterTable
ALTER TABLE `Location`
    ADD COLUMN `isFirstDayEligible` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isLastDayEligible` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `SegmentTimeBlock`
    ADD COLUMN `variant` ENUM('basic', 'early', 'extend', 'earlyExtend') NOT NULL DEFAULT 'basic';

-- AlterTable
ALTER TABLE `SegmentVersionTimeBlock`
    ADD COLUMN `variant` ENUM('basic', 'early', 'extend', 'earlyExtend') NOT NULL DEFAULT 'basic';

-- AlterTable
ALTER TABLE `TimeBlock`
    ADD COLUMN `profile` ENUM('DEFAULT', 'FIRST_DAY', 'FIRST_DAY_EARLY') NOT NULL DEFAULT 'DEFAULT';

-- CreateIndex
CREATE UNIQUE INDEX `SegmentTimeBlock_segmentId_variant_orderIndex_key`
    ON `SegmentTimeBlock`(`segmentId`, `variant`, `orderIndex`);

-- CreateIndex
CREATE UNIQUE INDEX `SegmentVersionTimeBlock_segmentVersionId_variant_orderIndex_key`
    ON `SegmentVersionTimeBlock`(`segmentVersionId`, `variant`, `orderIndex`);

-- CreateIndex
CREATE UNIQUE INDEX `TimeBlock_locationVersionId_profile_orderIndex_key`
    ON `TimeBlock`(`locationVersionId`, `profile`, `orderIndex`);
