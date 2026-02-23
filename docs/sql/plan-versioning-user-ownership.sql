CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlanVersion` (
  `id` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `parentVersionId` VARCHAR(191) NULL,
  `versionNumber` INTEGER NOT NULL,
  `variantType` ENUM('basic', 'early', 'afternoon', 'extend') NOT NULL,
  `totalDays` INTEGER NOT NULL,
  `changeNote` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `PlanVersion_planId_idx`(`planId`),
  INDEX `PlanVersion_parentVersionId_idx`(`parentVersionId`),
  UNIQUE INDEX `PlanVersion_planId_versionNumber_key`(`planId`, `versionNumber`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Plan`
  ADD COLUMN `userId` VARCHAR(191) NULL,
  ADD COLUMN `title` VARCHAR(191) NULL,
  ADD COLUMN `currentVersionId` VARCHAR(191) NULL;

ALTER TABLE `PlanStop`
  ADD COLUMN `planVersionId` VARCHAR(191) NULL;

ALTER TABLE `Override`
  ADD COLUMN `planVersionId` VARCHAR(191) NULL;

INSERT INTO `User` (`id`, `name`, `email`, `createdAt`, `updatedAt`)
VALUES ('default_user_migrated', 'Default User', 'default-user@leaders.local', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `updatedAt` = NOW(3);

UPDATE `Plan`
SET
  `userId` = 'default_user_migrated',
  `title` = COALESCE(NULLIF(`title`, ''), CONCAT('Plan ', `id`));

INSERT INTO `PlanVersion` (
  `id`,
  `planId`,
  `parentVersionId`,
  `versionNumber`,
  `variantType`,
  `totalDays`,
  `changeNote`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  p.`id`,
  NULL,
  1,
  p.`variantType`,
  p.`totalDays`,
  NULL,
  p.`createdAt`,
  p.`updatedAt`
FROM `Plan` p
WHERE NOT EXISTS (
  SELECT 1
  FROM `PlanVersion` pv
  WHERE pv.`planId` = p.`id`
    AND pv.`versionNumber` = 1
);

UPDATE `PlanStop` ps
JOIN `PlanVersion` pv
  ON pv.`planId` = ps.`planId`
 AND pv.`versionNumber` = 1
SET ps.`planVersionId` = pv.`id`;

UPDATE `Override` o
JOIN `PlanVersion` pv
  ON pv.`planId` = o.`planId`
 AND pv.`versionNumber` = 1
SET o.`planVersionId` = pv.`id`;

UPDATE `Plan` p
JOIN `PlanVersion` pv
  ON pv.`planId` = p.`id`
 AND pv.`versionNumber` = 1
SET p.`currentVersionId` = pv.`id`;

ALTER TABLE `Plan`
  MODIFY `userId` VARCHAR(191) NOT NULL,
  MODIFY `title` VARCHAR(191) NOT NULL;

ALTER TABLE `PlanStop`
  MODIFY `planVersionId` VARCHAR(191) NOT NULL;

ALTER TABLE `Override`
  MODIFY `planVersionId` VARCHAR(191) NOT NULL;

CREATE INDEX `Plan_userId_idx` ON `Plan`(`userId`);
CREATE INDEX `Plan_currentVersionId_idx` ON `Plan`(`currentVersionId`);
CREATE INDEX `PlanStop_planVersionId_idx` ON `PlanStop`(`planVersionId`);
CREATE INDEX `Override_planVersionId_idx` ON `Override`(`planVersionId`);

ALTER TABLE `PlanVersion`
  ADD CONSTRAINT `PlanVersion_planId_fkey`
  FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `PlanVersion`
  ADD CONSTRAINT `PlanVersion_parentVersionId_fkey`
  FOREIGN KEY (`parentVersionId`) REFERENCES `PlanVersion`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `Plan`
  ADD CONSTRAINT `Plan_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `Plan`
  ADD CONSTRAINT `Plan_currentVersionId_fkey`
  FOREIGN KEY (`currentVersionId`) REFERENCES `PlanVersion`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `PlanStop`
  ADD CONSTRAINT `PlanStop_planVersionId_fkey`
  FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `Override`
  ADD CONSTRAINT `Override_planVersionId_fkey`
  FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `PlanStop` DROP FOREIGN KEY `PlanStop_planId_fkey`;
ALTER TABLE `Override` DROP FOREIGN KEY `Override_planId_fkey`;

DROP INDEX `PlanStop_planId_idx` ON `PlanStop`;
DROP INDEX `Override_planId_idx` ON `Override`;

ALTER TABLE `Plan`
  DROP COLUMN `variantType`,
  DROP COLUMN `totalDays`;

ALTER TABLE `PlanStop`
  DROP COLUMN `planId`;

ALTER TABLE `Override`
  DROP COLUMN `planId`;
