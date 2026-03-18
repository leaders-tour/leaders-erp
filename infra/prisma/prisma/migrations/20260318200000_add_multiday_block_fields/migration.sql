-- Add BlockType enum and multi-day block fields (additive, backfill for existing data).
-- OvernightStay: blockType, startLocationId, endLocationId
-- OvernightStayDay: displayLocationId
-- PlanStop / PlanTemplateStop: multiDayBlockId, multiDayBlockDayOrder, multiDayBlockConnectionId, multiDayBlockConnectionVersionId

-- 1. OvernightStay: add nullable columns, backfill, then set NOT NULL and add FKs
ALTER TABLE `OvernightStay` ADD COLUMN `blockType` ENUM('STAY', 'TRANSFER') NULL;
ALTER TABLE `OvernightStay` ADD COLUMN `startLocationId` VARCHAR(191) NULL;
ALTER TABLE `OvernightStay` ADD COLUMN `endLocationId` VARCHAR(191) NULL;

UPDATE `OvernightStay` SET `blockType` = 'STAY', `startLocationId` = `locationId`, `endLocationId` = `locationId`;

ALTER TABLE `OvernightStay` MODIFY COLUMN `blockType` ENUM('STAY', 'TRANSFER') NOT NULL DEFAULT 'STAY';
ALTER TABLE `OvernightStay` MODIFY COLUMN `startLocationId` VARCHAR(191) NOT NULL;
ALTER TABLE `OvernightStay` MODIFY COLUMN `endLocationId` VARCHAR(191) NOT NULL;

CREATE INDEX `OvernightStay_startLocationId_idx` ON `OvernightStay`(`startLocationId`);
CREATE INDEX `OvernightStay_endLocationId_idx` ON `OvernightStay`(`endLocationId`);

ALTER TABLE `OvernightStay` ADD CONSTRAINT `OvernightStay_startLocationId_fkey` FOREIGN KEY (`startLocationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OvernightStay` ADD CONSTRAINT `OvernightStay_endLocationId_fkey` FOREIGN KEY (`endLocationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. OvernightStayDay: add displayLocationId nullable, backfill, then NOT NULL and FK
ALTER TABLE `OvernightStayDay` ADD COLUMN `displayLocationId` VARCHAR(191) NULL;

UPDATE `OvernightStayDay` d
INNER JOIN `OvernightStay` o ON d.`overnightStayId` = o.`id`
SET d.`displayLocationId` = o.`locationId`;

ALTER TABLE `OvernightStayDay` MODIFY COLUMN `displayLocationId` VARCHAR(191) NOT NULL;

CREATE INDEX `OvernightStayDay_displayLocationId_idx` ON `OvernightStayDay`(`displayLocationId`);

ALTER TABLE `OvernightStayDay` ADD CONSTRAINT `OvernightStayDay_displayLocationId_fkey` FOREIGN KEY (`displayLocationId`) REFERENCES `Location`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. PlanStop: add multiDayBlock* columns (nullable, backfill from overnightStay*)
ALTER TABLE `PlanStop` ADD COLUMN `multiDayBlockId` VARCHAR(191) NULL;
ALTER TABLE `PlanStop` ADD COLUMN `multiDayBlockDayOrder` INTEGER NULL;
ALTER TABLE `PlanStop` ADD COLUMN `multiDayBlockConnectionId` VARCHAR(191) NULL;
ALTER TABLE `PlanStop` ADD COLUMN `multiDayBlockConnectionVersionId` VARCHAR(191) NULL;

UPDATE `PlanStop` SET `multiDayBlockId` = `overnightStayId`, `multiDayBlockDayOrder` = `overnightStayDayOrder` WHERE `overnightStayId` IS NOT NULL;
UPDATE `PlanStop` SET `multiDayBlockConnectionId` = `overnightStayConnectionId`, `multiDayBlockConnectionVersionId` = `overnightStayConnectionVersionId` WHERE `overnightStayConnectionId` IS NOT NULL;

CREATE INDEX `PlanStop_multiDayBlockId_idx` ON `PlanStop`(`multiDayBlockId`);
CREATE INDEX `PlanStop_multiDayBlockConnectionId_idx` ON `PlanStop`(`multiDayBlockConnectionId`);
CREATE INDEX `PlanStop_multiDayBlockConnectionVersionId_idx` ON `PlanStop`(`multiDayBlockConnectionVersionId`);

ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_multiDayBlockId_fkey` FOREIGN KEY (`multiDayBlockId`) REFERENCES `OvernightStay`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_multiDayBlockConnectionId_fkey` FOREIGN KEY (`multiDayBlockConnectionId`) REFERENCES `OvernightStayConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PlanStop` ADD CONSTRAINT `PlanStop_multiDayBlockConnectionVersionId_fkey` FOREIGN KEY (`multiDayBlockConnectionVersionId`) REFERENCES `OvernightStayConnectionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. PlanTemplateStop: same
ALTER TABLE `PlanTemplateStop` ADD COLUMN `multiDayBlockId` VARCHAR(191) NULL;
ALTER TABLE `PlanTemplateStop` ADD COLUMN `multiDayBlockDayOrder` INTEGER NULL;
ALTER TABLE `PlanTemplateStop` ADD COLUMN `multiDayBlockConnectionId` VARCHAR(191) NULL;
ALTER TABLE `PlanTemplateStop` ADD COLUMN `multiDayBlockConnectionVersionId` VARCHAR(191) NULL;

UPDATE `PlanTemplateStop` SET `multiDayBlockId` = `overnightStayId`, `multiDayBlockDayOrder` = `overnightStayDayOrder` WHERE `overnightStayId` IS NOT NULL;
UPDATE `PlanTemplateStop` SET `multiDayBlockConnectionId` = `overnightStayConnectionId`, `multiDayBlockConnectionVersionId` = `overnightStayConnectionVersionId` WHERE `overnightStayConnectionId` IS NOT NULL;

CREATE INDEX `PlanTemplateStop_multiDayBlockId_idx` ON `PlanTemplateStop`(`multiDayBlockId`);
CREATE INDEX `PlanTemplateStop_multiDayBlockConnectionId_idx` ON `PlanTemplateStop`(`multiDayBlockConnectionId`);
CREATE INDEX `PlanTemplateStop_multiDayBlockConnectionVersionId_idx` ON `PlanTemplateStop`(`multiDayBlockConnectionVersionId`);

ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_multiDayBlockId_fkey` FOREIGN KEY (`multiDayBlockId`) REFERENCES `OvernightStay`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_multiDayBlockConnectionId_fkey` FOREIGN KEY (`multiDayBlockConnectionId`) REFERENCES `OvernightStayConnection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PlanTemplateStop` ADD CONSTRAINT `PlanTemplateStop_multiDayBlockConnectionVersionId_fkey` FOREIGN KEY (`multiDayBlockConnectionVersionId`) REFERENCES `OvernightStayConnectionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
