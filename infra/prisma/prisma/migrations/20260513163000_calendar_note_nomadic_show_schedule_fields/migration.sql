-- AlterEnum — CalendarNoteKind에 NOMADIC_SHOW 추가
ALTER TABLE `CalendarNote` MODIFY COLUMN `kind` ENUM(
  'GUEST_HOUSE',
  'PICKUP',
  'DROP',
  'CAMEL_DOLL',
  'CUSTOM',
  'NOMADIC_SHOW'
) NOT NULL;

-- AlterTable — 시간·인원(선택)
ALTER TABLE `CalendarNote`
ADD COLUMN `timeText` VARCHAR(10) NULL,
ADD COLUMN `headcount` INT NULL;

-- 기존 낙타인형 플래그 → 일정 행으로 이관 (동일 확정 건에 CAMEL_DOLL 일정이 없을 때만)
INSERT INTO `CalendarNote` (
  `id`,
  `occursOn`,
  `kind`,
  `customText`,
  `timeText`,
  `headcount`,
  `confirmedTripId`,
  `memo`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  DATE(COALESCE(`travelStart`, `travelEnd`, `pickupDate`, `dropDate`, `confirmedAt`)),
  'CAMEL_DOLL',
  NULL,
  NULL,
  NULL,
  `id`,
  NULL,
  NOW(3),
  NOW(3)
FROM `ConfirmedTrip`
WHERE `camelDollPurchased` = 1
  AND DATE(COALESCE(`travelStart`, `travelEnd`, `pickupDate`, `dropDate`, `confirmedAt`)) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `CalendarNote` cn
    WHERE cn.`confirmedTripId` = `ConfirmedTrip`.`id` AND cn.`kind` = 'CAMEL_DOLL'
  );
