SET @include_rental_items_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'PlanVersionMeta'
    AND COLUMN_NAME = 'includeRentalItems'
);

SET @add_include_rental_items_sql := IF(
  @include_rental_items_exists = 0,
  'ALTER TABLE `PlanVersionMeta` ADD COLUMN `includeRentalItems` BOOLEAN NULL',
  'SELECT 1'
);

PREPARE add_include_rental_items_stmt FROM @add_include_rental_items_sql;
EXECUTE add_include_rental_items_stmt;
DEALLOCATE PREPARE add_include_rental_items_stmt;

UPDATE `PlanVersionMeta`
SET `includeRentalItems` = TRUE
WHERE `includeRentalItems` IS NULL;

ALTER TABLE `PlanVersionMeta`
  MODIFY COLUMN `includeRentalItems` BOOLEAN NOT NULL DEFAULT TRUE;
