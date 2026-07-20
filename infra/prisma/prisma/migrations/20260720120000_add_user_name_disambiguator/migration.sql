-- AlterTable
ALTER TABLE `User` ADD COLUMN `nameDisambiguator` VARCHAR(8) NULL;

-- Backfill: assign A,B,C,... to duplicate names (trimmed), oldest first by createdAt
UPDATE `User` AS u
INNER JOIN (
  SELECT
    ranked.id,
    CASE
      WHEN ranked.group_size > 1 AND ranked.row_num <= 26 THEN CHAR(64 + ranked.row_num)
      ELSE NULL
    END AS disambiguator
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY TRIM(`name`) ORDER BY `createdAt` ASC) AS row_num,
      COUNT(*) OVER (PARTITION BY TRIM(`name`)) AS group_size
    FROM `User`
  ) AS ranked
) AS assignment ON u.id = assignment.id
SET u.nameDisambiguator = assignment.disambiguator
WHERE assignment.disambiguator IS NOT NULL;
