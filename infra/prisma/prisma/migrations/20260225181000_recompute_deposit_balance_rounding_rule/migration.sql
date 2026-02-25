UPDATE `PlanVersionPricing`
SET
  `depositAmountKrw` = LEAST(
    ROUND(`totalAmountKrw` * 0.1) + ((`totalAmountKrw` - ROUND(`totalAmountKrw` * 0.1)) % 1000),
    `totalAmountKrw`
  ),
  `balanceAmountKrw` = `totalAmountKrw` - LEAST(
    ROUND(`totalAmountKrw` * 0.1) + ((`totalAmountKrw` - ROUND(`totalAmountKrw` * 0.1)) % 1000),
    `totalAmountKrw`
  );
