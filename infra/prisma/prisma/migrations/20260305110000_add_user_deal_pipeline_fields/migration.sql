-- Add deal pipeline stage fields to User.
ALTER TABLE `User`
  ADD COLUMN `dealStage` ENUM(
    'CONSULTING',
    'CONTRACTING',
    'CONTRACT_CONFIRMED',
    'MONGOL_ASSIGNING',
    'MONGOL_ASSIGNED',
    'ON_HOLD',
    'BEFORE_DEPARTURE_10D',
    'BEFORE_DEPARTURE_3D',
    'TRIP_COMPLETED'
  ) NOT NULL DEFAULT 'CONSULTING',
  ADD COLUMN `dealStageOrder` INT NOT NULL DEFAULT 0;

-- Backfill order: newest users first within consulting.
SET @rownum := -1;
UPDATE `User` AS u
JOIN (
  SELECT `id`, (@rownum := @rownum + 1) AS `rownum`
  FROM `User`
  ORDER BY `createdAt` DESC, `id` ASC
) AS ranked ON ranked.`id` = u.`id`
SET u.`dealStageOrder` = ranked.`rownum`;

CREATE INDEX `User_dealStage_dealStageOrder_idx` ON `User` (`dealStage`, `dealStageOrder`);
