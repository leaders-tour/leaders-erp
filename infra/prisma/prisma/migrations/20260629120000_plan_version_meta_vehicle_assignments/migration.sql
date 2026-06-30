-- PlanVersionMeta: 복수 차종·대수 배정
ALTER TABLE `PlanVersionMeta` ADD COLUMN `vehicleAssignments` JSON NULL;

-- 기존 단일 vehicleType → [{ vehicleType, count: 1 }]
UPDATE `PlanVersionMeta`
SET `vehicleAssignments` = JSON_ARRAY(JSON_OBJECT('vehicleType', `vehicleType`, 'count', 1))
WHERE `vehicleAssignments` IS NULL;
