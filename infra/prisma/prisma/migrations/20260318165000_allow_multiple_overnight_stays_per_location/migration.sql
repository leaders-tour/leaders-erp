ALTER TABLE `OvernightStay`
  ADD COLUMN `name` VARCHAR(191) NULL;

UPDATE `OvernightStay` AS `stay`
LEFT JOIN `Location` AS `location`
  ON `location`.`id` = `stay`.`locationId`
LEFT JOIN (
  SELECT `overnightStayId`, COUNT(*) AS `dayCount`
  FROM `OvernightStayDay`
  GROUP BY `overnightStayId`
) AS `day_counts`
  ON `day_counts`.`overnightStayId` = `stay`.`id`
SET `stay`.`name` = CONCAT(
  COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`location`.`name`, '$[0]')), 'null'), `stay`.`locationId`),
  ' ',
  CASE
    WHEN COALESCE(`day_counts`.`dayCount`, 0) >= 3 THEN '3'
    ELSE '2'
  END,
  '일 연박'
)
WHERE `stay`.`name` IS NULL;

ALTER TABLE `OvernightStay`
  MODIFY `name` VARCHAR(191) NOT NULL;

CREATE INDEX `OvernightStay_locationId_idx` ON `OvernightStay`(`locationId`);

DROP INDEX `OvernightStay_locationId_key` ON `OvernightStay`;
