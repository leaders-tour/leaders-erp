ALTER TABLE `Plan`
  ADD COLUMN `documentNumberBase` VARCHAR(191) NULL;

UPDATE `Plan` AS p
JOIN (
  SELECT
    pv.`planId`,
    pvm.`documentNumber`
  FROM `PlanVersion` AS pv
  INNER JOIN `PlanVersionMeta` AS pvm ON pvm.`planVersionId` = pv.`id`
  WHERE pv.`versionNumber` = 1
) AS src ON src.`planId` = p.`id`
SET p.`documentNumberBase` = CASE
  WHEN src.`documentNumber` REGEXP '^[0-9]{9}$' THEN src.`documentNumber`
  WHEN src.`documentNumber` REGEXP '^[0-9]{9}V[0-9]+$' THEN SUBSTRING(src.`documentNumber`, 1, 9)
  ELSE NULL
END;

CREATE TEMPORARY TABLE `tmp_missing_plan_base` (
  `id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateKey` INT NOT NULL,
  `seqInDate` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tmp_missing_plan_base` (`id`, `dateKey`, `seqInDate`)
SELECT
  ranked.`id`,
  ranked.`dateKey`,
  ranked.`seqInDate`
FROM (
  SELECT
    p.`id`,
    (DATE_FORMAT(p.`createdAt`, '%y%m%d') + 0) AS `dateKey`,
    (@seq_in_date := IF(@prev_date_key = (DATE_FORMAT(p.`createdAt`, '%y%m%d') + 0), @seq_in_date + 1, 0)) AS `seqInDate`,
    (@prev_date_key := (DATE_FORMAT(p.`createdAt`, '%y%m%d') + 0)) AS `_prevDate`
  FROM `Plan` AS p
  JOIN (SELECT @prev_date_key := -1, @seq_in_date := -1) AS vars
  WHERE p.`documentNumberBase` IS NULL
  ORDER BY (DATE_FORMAT(p.`createdAt`, '%y%m%d') + 0), p.`createdAt`, p.`id`
) AS ranked;

CREATE TEMPORARY TABLE `tmp_existing_plan_base_max` (
  `dateKey` INT NOT NULL,
  `maxSeq` INT NOT NULL,
  PRIMARY KEY (`dateKey`)
) ENGINE=InnoDB;

INSERT INTO `tmp_existing_plan_base_max` (`dateKey`, `maxSeq`)
SELECT
  (LEFT(p.`documentNumberBase`, 6) + 0) AS `dateKey`,
  MAX(CAST(RIGHT(p.`documentNumberBase`, 3) AS UNSIGNED)) AS `maxSeq`
FROM `Plan` AS p
WHERE p.`documentNumberBase` REGEXP '^[0-9]{9}$'
GROUP BY (LEFT(p.`documentNumberBase`, 6) + 0);

UPDATE `Plan` AS p
JOIN (
  SELECT
    missing.`id`,
    CONCAT(
      LPAD(missing.`dateKey`, 6, '0'),
      LPAD(
        (
          COALESCE(
            existing_max.`maxSeq`,
            -1
          ) + missing.`seqInDate` + 1
        ),
        3,
        '0'
      )
    ) AS `generatedBase`
  FROM `tmp_missing_plan_base` AS missing
  LEFT JOIN `tmp_existing_plan_base_max` AS existing_max ON existing_max.`dateKey` = missing.`dateKey`
) AS gen_rows ON gen_rows.`id` = p.`id`
SET p.`documentNumberBase` = gen_rows.`generatedBase`;

DROP TEMPORARY TABLE `tmp_existing_plan_base_max`;
DROP TEMPORARY TABLE `tmp_missing_plan_base`;

UPDATE `PlanVersionMeta` AS pvm
INNER JOIN `PlanVersion` AS pv ON pv.`id` = pvm.`planVersionId`
INNER JOIN `Plan` AS p ON p.`id` = pv.`planId`
SET pvm.`documentNumber` = CONCAT(p.`documentNumberBase`, 'V', pv.`versionNumber`);

ALTER TABLE `Plan`
  MODIFY `documentNumberBase` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `Plan_documentNumberBase_key` ON `Plan`(`documentNumberBase`);
