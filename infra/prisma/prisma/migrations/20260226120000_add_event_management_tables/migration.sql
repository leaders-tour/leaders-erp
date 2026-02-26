CREATE TABLE `Event` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `securityDepositKrw` INTEGER NOT NULL DEFAULT 0,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Event_code_key`(`code`),
  INDEX `Event_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlanVersionEvent` (
  `id` VARCHAR(191) NOT NULL,
  `planVersionId` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `PlanVersionEvent_planVersionId_eventId_key`(`planVersionId`, `eventId`),
  INDEX `PlanVersionEvent_planVersionId_idx`(`planVersionId`),
  INDEX `PlanVersionEvent_eventId_idx`(`eventId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlanVersionEvent`
  ADD CONSTRAINT `PlanVersionEvent_planVersionId_fkey`
  FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlanVersionEvent`
  ADD CONSTRAINT `PlanVersionEvent_eventId_fkey`
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `Event` (`id`, `code`, `name`, `isActive`, `securityDepositKrw`, `sortOrder`, `updatedAt`)
VALUES
  ('event_a', 'A', '이벤트 A', true, 0, 10, NOW(3)),
  ('event_b', 'B', '이벤트 B', true, 0, 20, NOW(3)),
  ('event_c', 'C', '이벤트 C', true, 0, 30, NOW(3))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `isActive` = VALUES(`isActive`),
  `sortOrder` = VALUES(`sortOrder`),
  `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `PlanVersionEvent` (`id`, `planVersionId`, `eventId`, `createdAt`)
SELECT UUID(), `m`.`planVersionId`, `e`.`id`, NOW(3)
FROM `PlanVersionMeta` `m`
JOIN `Event` `e` ON `e`.`code` = 'A'
WHERE JSON_CONTAINS(COALESCE(`m`.`eventCodes`, JSON_ARRAY()), JSON_QUOTE('A'))
ON DUPLICATE KEY UPDATE `eventId` = VALUES(`eventId`);

INSERT INTO `PlanVersionEvent` (`id`, `planVersionId`, `eventId`, `createdAt`)
SELECT UUID(), `m`.`planVersionId`, `e`.`id`, NOW(3)
FROM `PlanVersionMeta` `m`
JOIN `Event` `e` ON `e`.`code` = 'B'
WHERE JSON_CONTAINS(COALESCE(`m`.`eventCodes`, JSON_ARRAY()), JSON_QUOTE('B'))
ON DUPLICATE KEY UPDATE `eventId` = VALUES(`eventId`);

INSERT INTO `PlanVersionEvent` (`id`, `planVersionId`, `eventId`, `createdAt`)
SELECT UUID(), `m`.`planVersionId`, `e`.`id`, NOW(3)
FROM `PlanVersionMeta` `m`
JOIN `Event` `e` ON `e`.`code` = 'C'
WHERE JSON_CONTAINS(COALESCE(`m`.`eventCodes`, JSON_ARRAY()), JSON_QUOTE('C'))
ON DUPLICATE KEY UPDATE `eventId` = VALUES(`eventId`);
