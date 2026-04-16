ALTER TABLE `User`
  ADD COLUMN `attachments` JSON NOT NULL DEFAULT ('[]');
