-- Event 렌탈 매핑 보정: 실제 운영 이벤트명은 "스타링크 대여 이벤트"처럼 접미사가 붙어 있다.
-- 이미 적용된 20260512143000_event_tour_list_rental_item 은 수정하지 않고, 누락 매핑만 보정한다.

UPDATE `Event`
SET `tourListRentalItem` = 'DRONE'
WHERE `tourListRentalItem` IS NULL
  AND `name` LIKE '%드론%';

UPDATE `Event`
SET `tourListRentalItem` = 'STARLINK'
WHERE `tourListRentalItem` IS NULL
  AND `name` LIKE '%스타링크%';

UPDATE `Event`
SET `tourListRentalItem` = 'POWERBANK'
WHERE `tourListRentalItem` IS NULL
  AND `name` LIKE '%파워뱅크%';

-- 보수적 재백필: 기존 확정 투어는 누락된 true만 채운다.
UPDATE `ConfirmedTrip` ct
INNER JOIN `PlanVersionEvent` pve ON pve.`planVersionId` = ct.`planVersionId`
INNER JOIN `Event` e ON e.`id` = pve.`eventId` AND e.`tourListRentalItem` = 'DRONE'
SET ct.`rentalDrone` = true,
    ct.`updatedAt` = CURRENT_TIMESTAMP(3)
WHERE ct.`planVersionId` IS NOT NULL
  AND ct.`status` = 'ACTIVE'
  AND ct.`rentalDrone` = false;

UPDATE `ConfirmedTrip` ct
INNER JOIN `PlanVersionEvent` pve ON pve.`planVersionId` = ct.`planVersionId`
INNER JOIN `Event` e ON e.`id` = pve.`eventId` AND e.`tourListRentalItem` = 'STARLINK'
SET ct.`rentalStarlink` = true,
    ct.`updatedAt` = CURRENT_TIMESTAMP(3)
WHERE ct.`planVersionId` IS NOT NULL
  AND ct.`status` = 'ACTIVE'
  AND ct.`rentalStarlink` = false;

UPDATE `ConfirmedTrip` ct
INNER JOIN `PlanVersionEvent` pve ON pve.`planVersionId` = ct.`planVersionId`
INNER JOIN `Event` e ON e.`id` = pve.`eventId` AND e.`tourListRentalItem` = 'POWERBANK'
SET ct.`rentalPowerbank` = true,
    ct.`updatedAt` = CURRENT_TIMESTAMP(3)
WHERE ct.`planVersionId` IS NOT NULL
  AND ct.`status` = 'ACTIVE'
  AND ct.`rentalPowerbank` = false;
