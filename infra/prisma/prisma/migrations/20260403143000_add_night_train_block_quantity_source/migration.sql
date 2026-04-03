ALTER TABLE `PricingRule`
  MODIFY COLUMN `quantitySource` ENUM(
    'ONE',
    'HEADCOUNT',
    'TOTAL_DAYS',
    'LONG_DISTANCE_SEGMENT_COUNT',
    'NIGHT_TRAIN_BLOCK_COUNT',
    'SUM_EXTRA_LODGING_COUNTS'
  ) NOT NULL;

UPDATE `PricingRule`
SET
  `quantitySource` = 'LONG_DISTANCE_SEGMENT_COUNT',
  `nightTrainRequired` = NULL,
  `nightTrainMinCount` = NULL,
  `longDistanceMinCount` = NULL
WHERE `lineCode` = 'LONG_DISTANCE'
  AND `quantitySource` = 'ONE';

UPDATE `PricingRule`
SET
  `quantitySource` = 'NIGHT_TRAIN_BLOCK_COUNT',
  `nightTrainRequired` = NULL,
  `nightTrainMinCount` = NULL,
  `longDistanceMinCount` = NULL
WHERE `lineCode` = 'NIGHT_TRAIN'
  AND `quantitySource` = 'ONE';
