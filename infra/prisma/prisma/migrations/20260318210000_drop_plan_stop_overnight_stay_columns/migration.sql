-- Drop legacy overnightStay* columns and relations from PlanStop and PlanTemplateStop.
-- multiDayBlock* columns are now the only block/connection references.

-- PlanTemplateStop: drop foreign keys
ALTER TABLE `PlanTemplateStop` DROP FOREIGN KEY `PlanTemplateStop_overnightStayId_fkey`;
ALTER TABLE `PlanTemplateStop` DROP FOREIGN KEY `PlanTemplateStop_overnightStayConnectionId_fkey`;
ALTER TABLE `PlanTemplateStop` DROP FOREIGN KEY `PlanTemplateStop_overnightStayConnectionVersionId_fkey`;

-- PlanTemplateStop: drop indexes
DROP INDEX `PlanTemplateStop_overnightStayId_idx` ON `PlanTemplateStop`;
DROP INDEX `PlanTemplateStop_overnightStayConnectionId_idx` ON `PlanTemplateStop`;
DROP INDEX `PlanTemplateStop_overnightStayConnectionVersionId_idx` ON `PlanTemplateStop`;

-- PlanTemplateStop: drop columns
ALTER TABLE `PlanTemplateStop` DROP COLUMN `overnightStayId`, DROP COLUMN `overnightStayDayOrder`, DROP COLUMN `overnightStayConnectionId`, DROP COLUMN `overnightStayConnectionVersionId`;

-- PlanStop: drop foreign keys
ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_overnightStayId_fkey`;
ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_overnightStayConnectionId_fkey`;
ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_overnightStayConnectionVersionId_fkey`;

-- PlanStop: drop indexes
DROP INDEX `PlanStop_overnightStayId_idx` ON `PlanStop`;
DROP INDEX `PlanStop_overnightStayConnectionId_idx` ON `PlanStop`;
DROP INDEX `PlanStop_overnightStayConnectionVersionId_idx` ON `PlanStop`;

-- PlanStop: drop columns
ALTER TABLE `PlanStop` DROP COLUMN `overnightStayId`, DROP COLUMN `overnightStayDayOrder`, DROP COLUMN `overnightStayConnectionId`, DROP COLUMN `overnightStayConnectionVersionId`;
