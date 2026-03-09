UPDATE `DealTodoTemplate`
SET
  `isActive` = false,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `isActive` = true
  AND `stage` IN (
    'CONSULTING',
    'CONTRACTING',
    'CONTRACT_CONFIRMED',
    'MONGOL_ASSIGNING',
    'MONGOL_ASSIGNED',
    'ON_HOLD',
    'BEFORE_DEPARTURE_10D',
    'BEFORE_DEPARTURE_3D',
    'TRIP_COMPLETED'
  );

INSERT INTO `DealTodoTemplate` (`id`, `stage`, `title`, `description`, `sortOrder`, `isActive`, `updatedAt`)
VALUES
  (uuid(), 'CONTRACTING', '계약서 작성 진행률 체크', NULL, 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'CONTRACTING', '예약금 입금 확인', NULL, 20, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'CONTRACT_CONFIRMED', '몽골 배정 요청', NULL, 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'MONGOL_ASSIGNING', '숙소배정', NULL, 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'MONGOL_ASSIGNING', '가이드 배정', NULL, 20, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'MONGOL_ASSIGNING', '기사님 배정', NULL, 30, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'MONGOL_ASSIGNED', '확정서 전송', NULL, 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'BEFORE_DEPARTURE_10D', '확정서 발송여부 더블체크', NULL, 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'BEFORE_DEPARTURE_10D', '고객 리마인드', NULL, 20, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'BEFORE_DEPARTURE_3D', '오픈채팅방 개설', NULL, 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'TRIP_COMPLETED', '리뷰 안내', NULL, 10, true, CURRENT_TIMESTAMP(3));
