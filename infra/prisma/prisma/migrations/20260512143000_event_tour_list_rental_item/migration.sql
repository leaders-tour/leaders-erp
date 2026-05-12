-- Event: 투어리스트 렌탈 매핑(드론/스타링크/파워뱅크)
-- -----------------------------------------------------------------------------
-- [리포트] 마이그레이션 전: 이름으로 매핑될 이벤트 후보
--   SELECT `id`, `name` FROM `Event` WHERE `name` IN ('드론', '스타링크', '파워뱅크');
--
-- [리포트] 마이그레이션 전: 플랜버전에 렌탈 이벤트가 있는데 ConfirmedTrip 플래그가 꺼진 ACTIVE 건
--   (컬럼 추가 전에는 이름으로 조인; 적용 후에는 tourListRentalItem 사용)
-- -----------------------------------------------------------------------------

ALTER TABLE `Event` ADD COLUMN `tourListRentalItem` ENUM('DRONE', 'STARLINK', 'POWERBANK') NULL;

-- 마스터 이벤트: 표시명 기준 백필 (필요 시 운영 DB에서 이름 확인 후 조정)
UPDATE `Event` SET `tourListRentalItem` = 'DRONE' WHERE `name` = '드론';
UPDATE `Event` SET `tourListRentalItem` = 'STARLINK' WHERE `name` = '스타링크';
UPDATE `Event` SET `tourListRentalItem` = 'POWERBANK' WHERE `name` = '파워뱅크';

-- ConfirmedTrip: 보수적 백필 (false -> true 만, planVersionId 있음, ACTIVE 만)
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

-- [리포트] 마이그레이션 후: 동일 불일치 잔여 건 (0건이면 백필 완료)
--   SELECT ct.`id`
--   FROM `ConfirmedTrip` ct
--   INNER JOIN `PlanVersionEvent` pve ON pve.`planVersionId` = ct.`planVersionId`
--   INNER JOIN `Event` e ON e.`id` = pve.`eventId`
--   WHERE ct.`planVersionId` IS NOT NULL
--     AND ct.`status` = 'ACTIVE'
--     AND (
--       (e.`tourListRentalItem` = 'DRONE' AND ct.`rentalDrone` = false)
--       OR (e.`tourListRentalItem` = 'STARLINK' AND ct.`rentalStarlink` = false)
--       OR (e.`tourListRentalItem` = 'POWERBANK' AND ct.`rentalPowerbank` = false)
--     );
