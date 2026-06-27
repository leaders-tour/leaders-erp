-- planVersionId가 있는 ACTIVE 확정 투어의 렌탈 플래그를
-- 연결된 PlanVersionEvent + Event.tourListRentalItem 기준으로 재동기화한다.
-- (견적 버전 교체 시 누락된 rentalStarlink 등 9건 불일치 수정)

UPDATE `ConfirmedTrip` ct
LEFT JOIN (
  SELECT
    pve.`planVersionId`,
    MAX(CASE WHEN e.`tourListRentalItem` = 'DRONE' THEN 1 ELSE 0 END) AS hasDrone,
    MAX(CASE WHEN e.`tourListRentalItem` = 'STARLINK' THEN 1 ELSE 0 END) AS hasStarlink,
    MAX(CASE WHEN e.`tourListRentalItem` = 'POWERBANK' THEN 1 ELSE 0 END) AS hasPowerbank
  FROM `PlanVersionEvent` pve
  INNER JOIN `Event` e ON e.`id` = pve.`eventId`
  WHERE e.`tourListRentalItem` IS NOT NULL
  GROUP BY pve.`planVersionId`
) flags ON flags.`planVersionId` = ct.`planVersionId`
SET
  ct.`rentalDrone` = (COALESCE(flags.hasDrone, 0) = 1),
  ct.`rentalStarlink` = (COALESCE(flags.hasStarlink, 0) = 1),
  ct.`rentalPowerbank` = (COALESCE(flags.hasPowerbank, 0) = 1),
  ct.`updatedAt` = CURRENT_TIMESTAMP(3)
WHERE ct.`planVersionId` IS NOT NULL
  AND ct.`status` = 'ACTIVE';
