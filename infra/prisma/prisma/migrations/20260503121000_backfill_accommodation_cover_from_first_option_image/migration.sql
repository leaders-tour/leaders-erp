-- Backfill coverImageUrl from the first image of the first option (by level, roomType, id),
-- matching apps/api repository OPTION_ORDER_BY and accommodationDisplayImageUrl() fallback.
UPDATE `Accommodation` AS `a`
SET `coverImageUrl` = (
  SELECT JSON_UNQUOTE(JSON_EXTRACT(`ao`.`imageUrls`, '$[0]'))
  FROM `AccommodationOption` AS `ao`
  WHERE `ao`.`accommodationId` = `a`.`id`
    AND JSON_LENGTH(COALESCE(`ao`.`imageUrls`, JSON_ARRAY())) > 0
  ORDER BY `ao`.`level` ASC, `ao`.`roomType` ASC, `ao`.`id` ASC
  LIMIT 1
)
WHERE `a`.`coverImageUrl` IS NULL
  AND EXISTS (
    SELECT 1
    FROM `AccommodationOption` AS `ao2`
    WHERE `ao2`.`accommodationId` = `a`.`id`
      AND JSON_LENGTH(COALESCE(`ao2`.`imageUrls`, JSON_ARRAY())) > 0
  );
