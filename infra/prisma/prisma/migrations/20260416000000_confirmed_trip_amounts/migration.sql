ALTER TABLE `ConfirmedTrip`
  ADD COLUMN `depositAmountKrw`         INT NULL,
  ADD COLUMN `balanceAmountKrw`         INT NULL,
  ADD COLUMN `totalAmountKrw`           INT NULL,
  ADD COLUMN `securityDepositAmountKrw` INT NULL,
  ADD COLUMN `groupTotalAmountKrw`      INT NULL;
