CREATE TABLE `PlanVersionMeta` (
  `id` VARCHAR(191) NOT NULL,
  `planVersionId` VARCHAR(191) NOT NULL,
  `leaderName` VARCHAR(191) NOT NULL,
  `documentNumber` VARCHAR(191) NOT NULL,
  `travelStartDate` DATETIME(3) NOT NULL,
  `travelEndDate` DATETIME(3) NOT NULL,
  `headcountTotal` INTEGER NOT NULL,
  `headcountMale` INTEGER NOT NULL,
  `headcountFemale` INTEGER NOT NULL,
  `vehicleType` VARCHAR(191) NOT NULL,
  `flightInTime` VARCHAR(191) NOT NULL,
  `flightOutTime` VARCHAR(191) NOT NULL,
  `pickupDropNote` VARCHAR(191) NULL,
  `externalPickupDropNote` VARCHAR(191) NULL,
  `rentalItemsText` TEXT NOT NULL,
  `eventCodes` JSON NOT NULL,
  `remark` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PlanVersionMeta_planVersionId_key`(`planVersionId`),
  UNIQUE INDEX `PlanVersionMeta_documentNumber_key`(`documentNumber`),
  INDEX `PlanVersionMeta_travelStartDate_idx`(`travelStartDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PlanVersionMeta`
  ADD CONSTRAINT `PlanVersionMeta_planVersionId_fkey`
  FOREIGN KEY (`planVersionId`) REFERENCES `PlanVersion`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

INSERT INTO `PlanVersionMeta` (
  `id`,
  `planVersionId`,
  `leaderName`,
  `documentNumber`,
  `travelStartDate`,
  `travelEndDate`,
  `headcountTotal`,
  `headcountMale`,
  `headcountFemale`,
  `vehicleType`,
  `flightInTime`,
  `flightOutTime`,
  `pickupDropNote`,
  `externalPickupDropNote`,
  `rentalItemsText`,
  `eventCodes`,
  `remark`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  pv.`id`,
  '미정',
  CONCAT(
    DATE_FORMAT(pv.`createdAt`, '%y%m%d'),
    LPAD(FLOOR(RAND() * 1000), 3, '0')
  ),
  DATE(pv.`createdAt`),
  DATE(pv.`createdAt`),
  6,
  6,
  0,
  '스타렉스',
  '08:00',
  '17:30',
  '',
  '',
  '판초 6개, 모기장 6개, 썰매 6개, 돗자리 2개, 별레이저 1개, 랜턴 1개, 멀티탭 2개, 드라이기 1개, 보드게임 1종, 버너/냄비/팬 set',
  JSON_ARRAY(),
  '',
  NOW(3),
  NOW(3)
FROM `PlanVersion` pv
LEFT JOIN `PlanVersionMeta` pvm ON pvm.`planVersionId` = pv.`id`
WHERE pvm.`id` IS NULL;
