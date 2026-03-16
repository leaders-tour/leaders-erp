-- AlterTable
ALTER TABLE `PlanStop` ADD COLUMN `segmentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PlanTemplateStop` ADD COLUMN `segmentId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `SegmentTimeBlock` (
    `id` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SegmentTimeBlock_segmentId_idx`(`segmentId`),
    UNIQUE INDEX `SegmentTimeBlock_segmentId_orderIndex_key`(`segmentId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SegmentActivity` (
    `id` VARCHAR(191) NOT NULL,
    `segmentTimeBlockId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `conditionNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SegmentActivity_segmentTimeBlockId_idx`(`segmentTimeBlockId`),
    UNIQUE INDEX `SegmentActivity_segmentTimeBlockId_orderIndex_key`(`segmentTimeBlockId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `PlanStop_segmentId_idx` ON `PlanStop`(`segmentId`);

-- CreateIndex
CREATE INDEX `PlanTemplateStop_segmentId_idx` ON `PlanTemplateStop`(`segmentId`);

-- Backfill segment schedules from each destination location's current version.
INSERT INTO `SegmentTimeBlock` (`id`, `segmentId`, `startTime`, `label`, `orderIndex`, `createdAt`, `updatedAt`)
SELECT
  UUID(),
  `s`.`id`,
  `tb`.`startTime`,
  `tb`.`label`,
  `tb`.`orderIndex`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Segment` AS `s`
INNER JOIN `Location` AS `l` ON `l`.`id` = `s`.`toLocationId`
INNER JOIN `TimeBlock` AS `tb` ON `tb`.`locationVersionId` = `l`.`currentVersionId`;

INSERT INTO `SegmentActivity` (`id`, `segmentTimeBlockId`, `description`, `orderIndex`, `isOptional`, `conditionNote`, `createdAt`, `updatedAt`)
SELECT
  UUID(),
  `stb`.`id`,
  `a`.`description`,
  `a`.`orderIndex`,
  `a`.`isOptional`,
  `a`.`conditionNote`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `SegmentTimeBlock` AS `stb`
INNER JOIN `Segment` AS `s` ON `s`.`id` = `stb`.`segmentId`
INNER JOIN `Location` AS `l` ON `l`.`id` = `s`.`toLocationId`
INNER JOIN `TimeBlock` AS `tb`
  ON `tb`.`locationVersionId` = `l`.`currentVersionId`
 AND `tb`.`orderIndex` = `stb`.`orderIndex`
INNER JOIN `Activity` AS `a` ON `a`.`timeBlockId` = `tb`.`id`;

-- Backfill template stop segment references from the prior day to the current day.
UPDATE `PlanTemplateStop` AS `currentStop`
INNER JOIN `PlanTemplateStop` AS `previousStop`
  ON `previousStop`.`planTemplateId` = `currentStop`.`planTemplateId`
 AND `previousStop`.`dayIndex` = `currentStop`.`dayIndex` - 1
INNER JOIN `Segment` AS `s`
  ON `s`.`fromLocationId` = `previousStop`.`locationId`
 AND `s`.`toLocationId` = `currentStop`.`locationId`
SET `currentStop`.`segmentId` = `s`.`id`
WHERE `previousStop`.`locationId` IS NOT NULL
  AND `currentStop`.`locationId` IS NOT NULL;

CREATE TEMPORARY TABLE `OrderedPlanStopBackfill` AS
SELECT
  `id`,
  `planVersionId`,
  `locationId`,
  ROW_NUMBER() OVER (PARTITION BY `planVersionId` ORDER BY `createdAt` ASC, `id` ASC) AS `dayOrder`
FROM `PlanStop`;

CREATE TEMPORARY TABLE `OrderedPlanStopBackfillPrevious` AS
SELECT * FROM `OrderedPlanStopBackfill`;

UPDATE `PlanStop` AS `currentStop`
INNER JOIN `OrderedPlanStopBackfill` AS `currentOrder`
  ON `currentOrder`.`id` = `currentStop`.`id`
INNER JOIN `OrderedPlanStopBackfillPrevious` AS `previousOrder`
  ON `previousOrder`.`planVersionId` = `currentOrder`.`planVersionId`
 AND `previousOrder`.`dayOrder` = `currentOrder`.`dayOrder` - 1
INNER JOIN `PlanStop` AS `previousStop` ON `previousStop`.`id` = `previousOrder`.`id`
INNER JOIN `Segment` AS `s`
  ON `s`.`fromLocationId` = `previousStop`.`locationId`
 AND `s`.`toLocationId` = `currentStop`.`locationId`
SET `currentStop`.`segmentId` = `s`.`id`
WHERE `previousStop`.`locationId` IS NOT NULL
  AND `currentStop`.`locationId` IS NOT NULL;

DROP TEMPORARY TABLE `OrderedPlanStopBackfill`;
DROP TEMPORARY TABLE `OrderedPlanStopBackfillPrevious`;

-- AddForeignKey
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `Segment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `Segment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentTimeBlock` ADD CONSTRAINT `SegmentTimeBlock_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `Segment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentActivity` ADD CONSTRAINT `SegmentActivity_segmentTimeBlockId_fkey` FOREIGN KEY (`segmentTimeBlockId`) REFERENCES `SegmentTimeBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
