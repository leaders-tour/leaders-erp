-- 미입력 성별 정책: 가이드는 여(FEMALE), 기사는 남(MALE)
UPDATE `Guide` SET `gender` = 'FEMALE' WHERE `gender` IS NULL;

UPDATE `Driver` SET `gender` = 'MALE' WHERE `gender` IS NULL;
