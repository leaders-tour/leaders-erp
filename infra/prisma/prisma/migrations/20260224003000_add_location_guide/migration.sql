CREATE TABLE `LocationGuide` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `imageUrls` JSON NOT NULL,
  `locationId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `LocationGuide_locationId_key`(`locationId`),
  INDEX `LocationGuide_locationId_idx`(`locationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LocationGuide`
  ADD CONSTRAINT `LocationGuide_locationId_fkey`
  FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
