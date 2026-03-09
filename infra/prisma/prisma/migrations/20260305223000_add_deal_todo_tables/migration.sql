CREATE TABLE `DealTodoTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `stage` ENUM(
    'CONSULTING',
    'CONTRACTING',
    'CONTRACT_CONFIRMED',
    'MONGOL_ASSIGNING',
    'MONGOL_ASSIGNED',
    'ON_HOLD',
    'BEFORE_DEPARTURE_10D',
    'BEFORE_DEPARTURE_3D',
    'TRIP_COMPLETED'
  ) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `DealTodoTemplate_stage_isActive_sortOrder_idx`(`stage`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserDealTodo` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `stage` ENUM(
    'CONSULTING',
    'CONTRACTING',
    'CONTRACT_CONFIRMED',
    'MONGOL_ASSIGNING',
    'MONGOL_ASSIGNED',
    'ON_HOLD',
    'BEFORE_DEPARTURE_10D',
    'BEFORE_DEPARTURE_3D',
    'TRIP_COMPLETED'
  ) NOT NULL,
  `templateId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('TODO', 'DOING', 'DONE') NOT NULL DEFAULT 'TODO',
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `UserDealTodo_userId_stage_templateId_key`(`userId`, `stage`, `templateId`),
  INDEX `UserDealTodo_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
  INDEX `UserDealTodo_userId_stage_status_idx`(`userId`, `stage`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserDealTodo`
  ADD CONSTRAINT `UserDealTodo_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserDealTodo`
  ADD CONSTRAINT `UserDealTodo_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `DealTodoTemplate`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `DealTodoTemplate` (`id`, `stage`, `title`, `description`, `sortOrder`, `isActive`, `updatedAt`)
VALUES
  (uuid(), 'CONSULTING', '[초기] 고객 니즈 확인', '고객의 기본 니즈와 일정 방향을 확인합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'CONTRACTING', '[계약] 계약서/결제 조건 안내', '계약 진행을 위한 필수 안내를 완료합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'CONTRACT_CONFIRMED', '[확정] 확정 정보 점검', '확정된 인원/일정/요청사항을 점검합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'MONGOL_ASSIGNING', '[배정] 현지 리소스 배정 요청', '현지 배정 절차를 시작합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'MONGOL_ASSIGNED', '[배정완료] 배정 결과 확인', '배정 완료 결과를 검증하고 공유합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'ON_HOLD', '[대기] 대기 사유 및 후속 일정 기록', '대기 사유와 재개 시점을 기록합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'BEFORE_DEPARTURE_10D', '[출발10일전] 출발 전 체크리스트 점검', '필수 준비사항을 최종 점검합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'BEFORE_DEPARTURE_3D', '[출발3일전] 최종 리마인드 발송', '출발 직전 안내와 리마인드를 완료합니다.', 10, true, CURRENT_TIMESTAMP(3)),
  (uuid(), 'TRIP_COMPLETED', '[완료] 사후 피드백 수집', '여행 완료 후 피드백과 정산을 마무리합니다.', 10, true, CURRENT_TIMESTAMP(3));
