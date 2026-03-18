-- Add rowType discriminator so saved planStops can include external transfer rows.
ALTER TABLE `PlanStop`
  ADD COLUMN `rowType` ENUM('MAIN', 'EXTERNAL_TRANSFER') NOT NULL DEFAULT 'MAIN';
