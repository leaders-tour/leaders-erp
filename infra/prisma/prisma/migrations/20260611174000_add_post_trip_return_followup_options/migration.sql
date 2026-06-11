-- Add default completed-trip post-return guidance options.
INSERT INTO `ConfirmedTripPostTripTaskOption` (`id`, `label`, `colorTone`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  (REPLACE(UUID(), '-', ''), '무사반납', 'slate', 5, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '장비파손', 'slate', 6, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (REPLACE(UUID(), '-', ''), '물품파손', 'slate', 7, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `isActive` = true,
  `updatedAt` = CURRENT_TIMESTAMP(3);
