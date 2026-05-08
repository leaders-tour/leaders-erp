-- 확정여행 배정에서 메인/보조(role) 컬럼 제거 (표시 순서는 sortOrder만 사용)

ALTER TABLE `ConfirmedTripGuideAssignment` DROP COLUMN `role`;

ALTER TABLE `ConfirmedTripDriverAssignment` DROP COLUMN `role`;
