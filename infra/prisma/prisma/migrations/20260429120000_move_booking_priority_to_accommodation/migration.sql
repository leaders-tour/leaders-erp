-- 숙소 단위 예약 우선순위로 격상 (옵션별 값 집계 후 최악(우선도 가장 낮음) 한 건만 반영)

SET SESSION group_concat_max_len = 65535;

-- AlterTable
ALTER TABLE `Accommodation` ADD COLUMN `bookingPriority` VARCHAR(191) NULL;

-- Backfill: 숙소별 옵션 중 예약 우선순위가 가장 불리한 값 하나 (알 수 없는 문자열은 보류보다 한 단계 더 불리하게 처리)
UPDATE `Accommodation` a
INNER JOIN (
  SELECT
    `accommodationId`,
    SUBSTRING_INDEX(
      GROUP_CONCAT(
        `bookingPriority`
        ORDER BY
          CASE `bookingPriority`
            WHEN '1순위' THEN 1
            WHEN '2순위' THEN 2
            WHEN '3순위' THEN 3
            WHEN '보류' THEN 4
            ELSE 5
          END DESC,
          `bookingPriority` DESC
        SEPARATOR '|||'
      ),
      '|||',
      1
    ) AS worst_priority
  FROM `AccommodationOption`
  WHERE `bookingPriority` IS NOT NULL AND TRIM(`bookingPriority`) != ''
  GROUP BY `accommodationId`
) w ON w.`accommodationId` = a.`id`
SET a.`bookingPriority` = w.`worst_priority`;

-- AlterTable
ALTER TABLE `AccommodationOption` DROP COLUMN `bookingPriority`;
