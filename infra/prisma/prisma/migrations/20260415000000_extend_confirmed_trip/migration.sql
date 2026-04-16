-- planId / planVersionId nullable 변경
ALTER TABLE `ConfirmedTrip` MODIFY `planId` VARCHAR(191) NULL;
ALTER TABLE `ConfirmedTrip` MODIFY `planVersionId` VARCHAR(191) NULL;

-- 신규 컬럼 추가
ALTER TABLE `ConfirmedTrip`
  ADD COLUMN `travelStart`     DATETIME(3)  NULL,
  ADD COLUMN `travelEnd`       DATETIME(3)  NULL,
  ADD COLUMN `destination`     VARCHAR(191) NULL,
  ADD COLUMN `paxCount`        INTEGER      NULL,
  ADD COLUMN `guideId`         VARCHAR(191) NULL,
  ADD COLUMN `driverId`        VARCHAR(191) NULL,
  ADD COLUMN `rentalGear`      BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN `rentalDrone`     BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN `rentalStarlink`  BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN `rentalPowerbank` BOOLEAN      NOT NULL DEFAULT false;

-- FK 제약 추가
ALTER TABLE `ConfirmedTrip`
  ADD CONSTRAINT `ConfirmedTrip_guideId_fkey`
    FOREIGN KEY (`guideId`) REFERENCES `Guide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ConfirmedTrip_driverId_fkey`
    FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 인덱스 추가
CREATE INDEX `ConfirmedTrip_guideId_idx`   ON `ConfirmedTrip`(`guideId`);
CREATE INDEX `ConfirmedTrip_driverId_idx`  ON `ConfirmedTrip`(`driverId`);
CREATE INDEX `ConfirmedTrip_travelStart_idx` ON `ConfirmedTrip`(`travelStart`);
