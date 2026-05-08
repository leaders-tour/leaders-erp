-- AlterTable
ALTER TABLE `PlanVersionMeta`
  MODIFY `flightInTime` VARCHAR(191) NULL,
  MODIFY `flightOutTime` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PlanVersionTransportGroup`
  MODIFY `flightInDate` DATETIME(3) NULL,
  MODIFY `flightInTime` VARCHAR(191) NULL,
  MODIFY `flightOutDate` DATETIME(3) NULL,
  MODIFY `flightOutTime` VARCHAR(191) NULL;
