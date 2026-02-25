ALTER TABLE `PlanVersionPricing`
  ADD COLUMN `depositAmountKrw` INT NULL,
  ADD COLUMN `balanceAmountKrw` INT NULL;

UPDATE `PlanVersionPricing`
SET
  `depositAmountKrw` = LEAST(ROUND(`totalAmountKrw` * 0.1) + (`totalAmountKrw` % 10000), `totalAmountKrw`),
  `balanceAmountKrw` = `totalAmountKrw` - LEAST(ROUND(`totalAmountKrw` * 0.1) + (`totalAmountKrw` % 10000), `totalAmountKrw`);

ALTER TABLE `PlanVersionPricing`
  MODIFY COLUMN `depositAmountKrw` INT NOT NULL,
  MODIFY COLUMN `balanceAmountKrw` INT NOT NULL;
