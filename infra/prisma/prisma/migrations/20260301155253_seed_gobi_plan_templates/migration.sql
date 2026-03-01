SET @gobiRegionId := (
  SELECT `id`
  FROM `Region`
  WHERE `name` = '고비'
  ORDER BY `createdAt` ASC
  LIMIT 1
);

SET @gobiLoc1Id := (
  SELECT `id`
  FROM `Location`
  WHERE `regionId` = @gobiRegionId
  ORDER BY `createdAt` ASC
  LIMIT 1
);

SET @gobiLoc2Id := COALESCE(
  (
    SELECT `id`
    FROM `Location`
    WHERE `regionId` = @gobiRegionId
    ORDER BY `createdAt` ASC
    LIMIT 1 OFFSET 1
  ),
  @gobiLoc1Id
);

SET @gobiLoc1VersionId := (
  SELECT COALESCE(
    `currentVersionId`,
    (
      SELECT `id`
      FROM `LocationVersion`
      WHERE `locationId` = @gobiLoc1Id
      ORDER BY `versionNumber` ASC
      LIMIT 1
    )
  )
  FROM `Location`
  WHERE `id` = @gobiLoc1Id
  LIMIT 1
);

SET @gobiLoc2VersionId := (
  SELECT COALESCE(
    `currentVersionId`,
    (
      SELECT `id`
      FROM `LocationVersion`
      WHERE `locationId` = @gobiLoc2Id
      ORDER BY `versionNumber` ASC
      LIMIT 1
    )
  )
  FROM `Location`
  WHERE `id` = @gobiLoc2Id
  LIMIT 1
);

INSERT INTO `PlanTemplate` (`id`, `name`, `description`, `regionId`, `totalDays`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`)
SELECT
  src.id,
  src.name,
  src.description,
  @gobiRegionId,
  src.totalDays,
  src.sortOrder,
  src.isActive,
  NOW(3),
  NOW(3)
FROM (
  SELECT 'seed_plan_template_gobi_6d_a' AS id, '고비 6일 A' AS name, '고비 기본 스캐폴드 A' AS description, 6 AS totalDays, 10 AS sortOrder, true AS isActive
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b', '고비 6일 B', '고비 기본 스캐폴드 B', 6, 20, true
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c', '고비 6일 C', '고비 기본 스캐폴드 C', 6, 30, true
) AS src
WHERE @gobiRegionId IS NOT NULL
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `regionId` = VALUES(`regionId`),
  `totalDays` = VALUES(`totalDays`),
  `sortOrder` = VALUES(`sortOrder`),
  `isActive` = VALUES(`isActive`),
  `updatedAt` = VALUES(`updatedAt`);

INSERT INTO `PlanTemplateStop` (
  `id`,
  `planTemplateId`,
  `dayIndex`,
  `locationId`,
  `locationVersionId`,
  `dateCellText`,
  `destinationCellText`,
  `timeCellText`,
  `scheduleCellText`,
  `lodgingCellText`,
  `mealCellText`,
  `createdAt`,
  `updatedAt`
)
SELECT
  src.id,
  src.planTemplateId,
  src.dayIndex,
  src.locationId,
  src.locationVersionId,
  src.dateCellText,
  src.destinationCellText,
  src.timeCellText,
  src.scheduleCellText,
  src.lodgingCellText,
  src.mealCellText,
  NOW(3),
  NOW(3)
FROM (
  SELECT 'seed_plan_template_gobi_6d_a_d1' AS id, 'seed_plan_template_gobi_6d_a' AS planTemplateId, 1 AS dayIndex, @gobiLoc1Id AS locationId, @gobiLoc1VersionId AS locationVersionId, '1일차' AS dateCellText, '출발지 (고비)\n(이동시간: 미정)' AS destinationCellText, '08:00\n12:00\n18:00' AS timeCellText, '공항/시내 미팅\n권역 이동 준비\n오리엔테이션' AS scheduleCellText, '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능' AS lodgingCellText, '아침 캠프식\n점심 현지식\n저녁 캠프식' AS mealCellText
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_a_d2', 'seed_plan_template_gobi_6d_a', 2, @gobiLoc2Id, @gobiLoc2VersionId, '2일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '사막 이동\n포인트 관광\n노을 감상', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_a_d3', 'seed_plan_template_gobi_6d_a', 3, @gobiLoc2Id, @gobiLoc2VersionId, '3일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '지형 탐방\n현지 체험\n별 관측', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_a_d4', 'seed_plan_template_gobi_6d_a', 4, @gobiLoc2Id, @gobiLoc2VersionId, '4일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '트레킹\n중간 휴식\n석식 및 자유시간', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_a_d5', 'seed_plan_template_gobi_6d_a', 5, @gobiLoc2Id, @gobiLoc2VersionId, '5일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '마지막 권역 일정\n기념 촬영\n복귀 준비', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_a_d6', 'seed_plan_template_gobi_6d_a', 6, @gobiLoc1Id, @gobiLoc1VersionId, '6일차', '복귀지\n(이동시간: 미정)', '08:00\n12:00\n18:00', '복귀 이동\n정산 및 마무리\n공항 이동', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b_d1', 'seed_plan_template_gobi_6d_b', 1, @gobiLoc1Id, @gobiLoc1VersionId, '1일차', '출발지 (고비)\n(이동시간: 미정)', '08:00\n12:00\n18:00', '가이드 미팅\n물품 점검\n출발 브리핑', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b_d2', 'seed_plan_template_gobi_6d_b', 2, @gobiLoc2Id, @gobiLoc2VersionId, '2일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '협곡 트레킹\n현지 점심\n사막 드라이브', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b_d3', 'seed_plan_template_gobi_6d_b', 3, @gobiLoc2Id, @gobiLoc2VersionId, '3일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '사막 포인트 탐방\n자유 촬영\n캠프 휴식', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b_d4', 'seed_plan_template_gobi_6d_b', 4, @gobiLoc2Id, @gobiLoc2VersionId, '4일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '체험 프로그램\n점심 휴식\n저녁 프로그램', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b_d5', 'seed_plan_template_gobi_6d_b', 5, @gobiLoc2Id, @gobiLoc2VersionId, '5일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '현지 교류\n포인트 재방문\n복귀 준비', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_b_d6', 'seed_plan_template_gobi_6d_b', 6, @gobiLoc1Id, @gobiLoc1VersionId, '6일차', '복귀지\n(이동시간: 미정)', '08:00\n12:00\n18:00', '복귀 이동\n일정 정리\n출국 준비', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c_d1', 'seed_plan_template_gobi_6d_c', 1, @gobiLoc1Id, @gobiLoc1VersionId, '1일차', '출발지 (고비)\n(이동시간: 미정)', '08:00\n12:00\n18:00', '입국/집결\n이동 오리엔테이션\n장비 점검', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c_d2', 'seed_plan_template_gobi_6d_c', 2, @gobiLoc2Id, @gobiLoc2VersionId, '2일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '사막 핵심 코스\n중간 촬영\n캠프 체크인', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c_d3', 'seed_plan_template_gobi_6d_c', 3, @gobiLoc2Id, @gobiLoc2VersionId, '3일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '심화 코스 이동\n현지 체험\n노을 프로그램', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c_d4', 'seed_plan_template_gobi_6d_c', 4, @gobiLoc2Id, @gobiLoc2VersionId, '4일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '유연 일정(현지상황 반영)\n여유 일정\n캠프 액티비티', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c_d5', 'seed_plan_template_gobi_6d_c', 5, @gobiLoc2Id, @gobiLoc2VersionId, '5일차', '고비 권역\n(이동시간: 미정)', '08:00\n12:00\n18:00', '복귀 전 일정\n마지막 체험\n짐 정리', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
  UNION ALL
  SELECT 'seed_plan_template_gobi_6d_c_d6', 'seed_plan_template_gobi_6d_c', 6, @gobiLoc1Id, @gobiLoc1VersionId, '6일차', '복귀지\n(이동시간: 미정)', '08:00\n12:00\n18:00', '복귀 이동\n일정 종료 안내\n출국', '템플릿 기본 숙소\n전기 가능\n샤워 가능\n인터넷 가능', '아침 캠프식\n점심 현지식\n저녁 캠프식'
) AS src
WHERE @gobiRegionId IS NOT NULL
ON DUPLICATE KEY UPDATE
  `planTemplateId` = VALUES(`planTemplateId`),
  `dayIndex` = VALUES(`dayIndex`),
  `locationId` = VALUES(`locationId`),
  `locationVersionId` = VALUES(`locationVersionId`),
  `dateCellText` = VALUES(`dateCellText`),
  `destinationCellText` = VALUES(`destinationCellText`),
  `timeCellText` = VALUES(`timeCellText`),
  `scheduleCellText` = VALUES(`scheduleCellText`),
  `lodgingCellText` = VALUES(`lodgingCellText`),
  `mealCellText` = VALUES(`mealCellText`),
  `updatedAt` = VALUES(`updatedAt`);
