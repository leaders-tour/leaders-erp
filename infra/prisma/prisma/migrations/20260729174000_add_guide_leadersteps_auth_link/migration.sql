ALTER TABLE `Guide`
  ADD COLUMN `leaderstepsAuthUserId` VARCHAR(191) NULL,
  ADD COLUMN `leaderstepsAuthLinkedAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `Guide_leaderstepsAuthUserId_key` (`leaderstepsAuthUserId`);
