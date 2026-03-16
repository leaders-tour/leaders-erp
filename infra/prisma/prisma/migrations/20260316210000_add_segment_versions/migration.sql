ALTER TABLE `PlanStop` ADD COLUMN `segmentVersionId` VARCHAR(191) NULL;

ALTER TABLE `PlanTemplateStop` ADD COLUMN `segmentVersionId` VARCHAR(191) NULL;

ALTER TABLE `Segment` ADD COLUMN `defaultVersionId` VARCHAR(191) NULL;

CREATE TABLE `SegmentVersion` (
    `id` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('DIRECT', 'VIA') NOT NULL,
    `averageDistanceKm` DOUBLE NOT NULL,
    `averageTravelHours` DOUBLE NOT NULL,
    `isLongDistance` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SegmentVersion_segmentId_idx`(`segmentId`),
    UNIQUE INDEX `SegmentVersion_segmentId_sortOrder_key`(`segmentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SegmentVersionViaLocation` (
    `id` VARCHAR(191) NOT NULL,
    `segmentVersionId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SegmentVersionViaLocation_segmentVersionId_idx`(`segmentVersionId`),
    INDEX `SegmentVersionViaLocation_locationId_idx`(`locationId`),
    UNIQUE INDEX `SegmentVersionViaLocation_segmentVersionId_orderIndex_key`(`segmentVersionId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SegmentVersionTimeBlock` (
    `id` VARCHAR(191) NOT NULL,
    `segmentVersionId` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SegmentVersionTimeBlock_segmentVersionId_idx`(`segmentVersionId`),
    UNIQUE INDEX `SegmentVersionTimeBlock_segmentVersionId_orderIndex_key`(`segmentVersionId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SegmentVersionActivity` (
    `id` VARCHAR(191) NOT NULL,
    `segmentVersionTimeBlockId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `conditionNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SegmentVersionActivity_segmentVersionTimeBlockId_idx`(`segmentVersionTimeBlockId`),
    UNIQUE INDEX `SegmentVersionActivity_segmentVersionTimeBlockId_orderIndex_key`(`segmentVersionTimeBlockId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `PlanStop_segmentVersionId_idx` ON `PlanStop`(`segmentVersionId`);

CREATE INDEX `PlanTemplateStop_segmentVersionId_idx` ON `PlanTemplateStop`(`segmentVersionId`);

CREATE INDEX `Segment_defaultVersionId_idx` ON `Segment`(`defaultVersionId`);

ALTER TABLE `SegmentVersion` ADD CONSTRAINT `SegmentVersion_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `Segment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SegmentVersionViaLocation` ADD CONSTRAINT `SegmentVersionViaLocation_segmentVersionId_fkey` FOREIGN KEY (`segmentVersionId`) REFERENCES `SegmentVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SegmentVersionViaLocation` ADD CONSTRAINT `SegmentVersionViaLocation_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SegmentVersionTimeBlock` ADD CONSTRAINT `SegmentVersionTimeBlock_segmentVersionId_fkey` FOREIGN KEY (`segmentVersionId`) REFERENCES `SegmentVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SegmentVersionActivity` ADD CONSTRAINT `SegmentVersionActivity_segmentVersionTimeBlockId_fkey` FOREIGN KEY (`segmentVersionTimeBlockId`) REFERENCES `SegmentVersionTimeBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `SegmentVersion` (
    `id`,
    `segmentId`,
    `name`,
    `kind`,
    `averageDistanceKm`,
    `averageTravelHours`,
    `isLongDistance`,
    `sortOrder`,
    `isDefault`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    `s`.`id`,
    'Direct',
    'DIRECT',
    `s`.`averageDistanceKm`,
    `s`.`averageTravelHours`,
    `s`.`isLongDistance`,
    0,
    true,
    `s`.`createdAt`,
    `s`.`updatedAt`
FROM `Segment` AS `s`;

UPDATE `Segment` AS `s`
INNER JOIN `SegmentVersion` AS `sv`
    ON `sv`.`segmentId` = `s`.`id`
   AND `sv`.`kind` = 'DIRECT'
   AND `sv`.`sortOrder` = 0
SET `s`.`defaultVersionId` = `sv`.`id`;

INSERT INTO `SegmentVersionTimeBlock` (
    `id`,
    `segmentVersionId`,
    `startTime`,
    `label`,
    `orderIndex`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    `sv`.`id`,
    `stb`.`startTime`,
    `stb`.`label`,
    `stb`.`orderIndex`,
    `stb`.`createdAt`,
    `stb`.`updatedAt`
FROM `SegmentTimeBlock` AS `stb`
INNER JOIN `SegmentVersion` AS `sv`
    ON `sv`.`segmentId` = `stb`.`segmentId`
   AND `sv`.`kind` = 'DIRECT'
   AND `sv`.`sortOrder` = 0;

INSERT INTO `SegmentVersionActivity` (
    `id`,
    `segmentVersionTimeBlockId`,
    `description`,
    `orderIndex`,
    `isOptional`,
    `conditionNote`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    `svtb`.`id`,
    `sa`.`description`,
    `sa`.`orderIndex`,
    `sa`.`isOptional`,
    `sa`.`conditionNote`,
    `sa`.`createdAt`,
    `sa`.`updatedAt`
FROM `SegmentActivity` AS `sa`
INNER JOIN `SegmentTimeBlock` AS `stb`
    ON `stb`.`id` = `sa`.`segmentTimeBlockId`
INNER JOIN `SegmentVersion` AS `sv`
    ON `sv`.`segmentId` = `stb`.`segmentId`
   AND `sv`.`kind` = 'DIRECT'
   AND `sv`.`sortOrder` = 0
INNER JOIN `SegmentVersionTimeBlock` AS `svtb`
    ON `svtb`.`segmentVersionId` = `sv`.`id`
   AND `svtb`.`orderIndex` = `stb`.`orderIndex`;

ALTER TABLE `Segment` ADD CONSTRAINT `Segment_defaultVersionId_fkey` FOREIGN KEY (`defaultVersionId`) REFERENCES `SegmentVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_segmentVersionId_fkey` FOREIGN KEY (`segmentVersionId`) REFERENCES `SegmentVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_segmentVersionId_fkey` FOREIGN KEY (`segmentVersionId`) REFERENCES `SegmentVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
