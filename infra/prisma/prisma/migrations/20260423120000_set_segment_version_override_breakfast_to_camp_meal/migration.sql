-- Backfill: SegmentVersion.overrideBreakfast 가 NULL('없음') 인 모든 행을 'CAMP_MEAL'('캠프식') 로 변경
-- 도착지 아침 기본값을 '없음' 대신 '캠프식'으로 일괄 변경하기 위한 데이터 마이그레이션.
UPDATE `SegmentVersion`
SET `overrideBreakfast` = 'CAMP_MEAL'
WHERE `overrideBreakfast` IS NULL;
