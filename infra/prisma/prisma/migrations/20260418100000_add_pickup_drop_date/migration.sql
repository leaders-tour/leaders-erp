-- AlterTable
ALTER TABLE `ConfirmedTrip`
  ADD COLUMN `pickupDate` DATETIME(3) NULL,
  ADD COLUMN `dropDate`   DATETIME(3) NULL;
