CREATE TABLE `Employee` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Employee_email_key`(`email`),
  INDEX `Employee_isActive_role_idx`(`isActive`, `role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmployeeRefreshToken` (
  `id` VARCHAR(191) NOT NULL,
  `employeeId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `userAgent` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `EmployeeRefreshToken_tokenHash_key`(`tokenHash`),
  INDEX `EmployeeRefreshToken_employeeId_expiresAt_idx`(`employeeId`, `expiresAt`),
  INDEX `EmployeeRefreshToken_employeeId_revokedAt_idx`(`employeeId`, `revokedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User`
  ADD COLUMN `ownerEmployeeId` VARCHAR(191) NULL;

CREATE INDEX `User_ownerEmployeeId_idx` ON `User`(`ownerEmployeeId`);

ALTER TABLE `EmployeeRefreshToken`
  ADD CONSTRAINT `EmployeeRefreshToken_employeeId_fkey`
  FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `User`
  ADD CONSTRAINT `User_ownerEmployeeId_fkey`
  FOREIGN KEY (`ownerEmployeeId`) REFERENCES `Employee`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
