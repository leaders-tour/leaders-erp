-- Catalog dataset (실험 탭 전용). 기존 Location/Segment/Plan 테이블과 무관.

CREATE TABLE `CatalogRegion` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT '몽골',
    `description` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogRegion_code_key`(`code`),
    INDEX `CatalogRegion_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogPlace` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `placeType` ENUM('LODGING', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA') NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT '몽골',
    `regionId` VARCHAR(191) NULL,
    `parentPlaceId` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `lodgingLevel` VARCHAR(191) NULL,
    `rateSummary` VARCHAR(191) NULL,
    `linkLabel` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogPlace_code_key`(`code`),
    INDEX `CatalogPlace_placeType_status_sortOrder_idx`(`placeType`, `status`, `sortOrder`),
    INDEX `CatalogPlace_regionId_idx`(`regionId`),
    INDEX `CatalogPlace_parentPlaceId_idx`(`parentPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogRoute` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NULL,
    `fromPlaceId` VARCHAR(191) NOT NULL,
    `toPlaceId` VARCHAR(191) NOT NULL,
    `averageDistanceKm` DOUBLE NULL,
    `averageTravelHours` DOUBLE NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogRoute_code_key`(`code`),
    INDEX `CatalogRoute_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `CatalogRoute_fromPlaceId_toPlaceId_idx`(`fromPlaceId`, `toPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogElement` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `composition` ENUM('SINGLE', 'SET') NOT NULL DEFAULT 'SINGLE',
    `kind` ENUM('MEETING', 'TRANSFER', 'MEAL', 'EXPERIENCE', 'MIXED') NOT NULL,
    `defaultPlaceId` VARCHAR(191) NULL,
    `defaultPlaceMode` VARCHAR(191) NULL,
    `durationText` VARCHAR(191) NULL,
    `costRuleText` VARCHAR(191) NULL,
    `customerText` VARCHAR(191) NULL,
    `valueStatusText` VARCHAR(191) NOT NULL DEFAULT '설정 중',
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogElement_code_key`(`code`),
    INDEX `CatalogElement_composition_kind_status_sortOrder_idx`(`composition`, `kind`, `status`, `sortOrder`),
    INDEX `CatalogElement_defaultPlaceId_idx`(`defaultPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogElementItem` (
    `id` VARCHAR(191) NOT NULL,
    `setElementId` VARCHAR(191) NOT NULL,
    `memberElementId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CatalogElementItem_memberElementId_idx`(`memberElementId`),
    UNIQUE INDEX `CatalogElementItem_setElementId_orderIndex_key`(`setElementId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogBlock` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `shape` ENUM('DAY', 'SET') NOT NULL DEFAULT 'DAY',
    `dayCount` INTEGER NOT NULL DEFAULT 1,
    `fromLabel` VARCHAR(191) NULL,
    `toLabel` VARCHAR(191) NULL,
    `compositionText` VARCHAR(191) NULL,
    `distanceKm` DOUBLE NULL,
    `travelHours` DOUBLE NULL,
    `timeSaturationPct` INTEGER NULL,
    `timeSaturationText` VARCHAR(191) NULL,
    `fatigueScore` DOUBLE NULL,
    `estimatedCostText` VARCHAR(191) NULL,
    `calcStatusText` VARCHAR(191) NOT NULL DEFAULT '계산됨',
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogBlock_code_key`(`code`),
    INDEX `CatalogBlock_shape_status_sortOrder_idx`(`shape`, `status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CatalogBlockItem` (
    `id` VARCHAR(191) NOT NULL,
    `setBlockId` VARCHAR(191) NOT NULL,
    `memberBlockId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CatalogBlockItem_memberBlockId_idx`(`memberBlockId`),
    UNIQUE INDEX `CatalogBlockItem_setBlockId_orderIndex_key`(`setBlockId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CatalogPlace` ADD CONSTRAINT `CatalogPlace_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `CatalogRegion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CatalogPlace` ADD CONSTRAINT `CatalogPlace_parentPlaceId_fkey` FOREIGN KEY (`parentPlaceId`) REFERENCES `CatalogPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CatalogRoute` ADD CONSTRAINT `CatalogRoute_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `CatalogRegion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CatalogRoute` ADD CONSTRAINT `CatalogRoute_fromPlaceId_fkey` FOREIGN KEY (`fromPlaceId`) REFERENCES `CatalogPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CatalogRoute` ADD CONSTRAINT `CatalogRoute_toPlaceId_fkey` FOREIGN KEY (`toPlaceId`) REFERENCES `CatalogPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CatalogElement` ADD CONSTRAINT `CatalogElement_defaultPlaceId_fkey` FOREIGN KEY (`defaultPlaceId`) REFERENCES `CatalogPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CatalogElementItem` ADD CONSTRAINT `CatalogElementItem_setElementId_fkey` FOREIGN KEY (`setElementId`) REFERENCES `CatalogElement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CatalogElementItem` ADD CONSTRAINT `CatalogElementItem_memberElementId_fkey` FOREIGN KEY (`memberElementId`) REFERENCES `CatalogElement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CatalogBlockItem` ADD CONSTRAINT `CatalogBlockItem_setBlockId_fkey` FOREIGN KEY (`setBlockId`) REFERENCES `CatalogBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CatalogBlockItem` ADD CONSTRAINT `CatalogBlockItem_memberBlockId_fkey` FOREIGN KEY (`memberBlockId`) REFERENCES `CatalogBlock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: 목업 T01/T02/T03 샘플
INSERT INTO `CatalogRegion` (`id`, `code`, `name`, `country`, `description`, `status`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('crg_central', 'RG-001', '중부', '몽골', '울란바토르·미니사막 권역', 'ACTIVE', 1, NOW(3), NOW(3)),
('crg_gobi', 'RG-002', '고비', '몽골', '남부 고비 권역', 'ACTIVE', 2, NOW(3), NOW(3)),
('crg_khovsgol', 'RG-003', '홉스골', '몽골', '북부 홉스골 권역', 'ACTIVE', 3, NOW(3), NOW(3));

INSERT INTO `CatalogPlace` (`id`, `code`, `name`, `placeType`, `country`, `regionId`, `parentPlaceId`, `latitude`, `longitude`, `lodgingLevel`, `rateSummary`, `linkLabel`, `status`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('cpl_mini_desert', 'PL-AREA-01', '미니사막', 'AREA', '몽골', 'crg_central', NULL, 47.8500, 106.9000, NULL, NULL, NULL, 'ACTIVE', 0, NOW(3), NOW(3)),
('cpl_ulaanbaatar', 'PL-AREA-02', '울란바토르', 'AREA', '몽골', 'crg_central', NULL, 47.8864, 106.9057, NULL, NULL, NULL, 'ACTIVE', 1, NOW(3), NOW(3)),
('cpl_camp_a', 'PL-001', '미니사막 A캠프', 'LODGING', '몽골', 'crg_central', 'cpl_mini_desert', 47.8512, 106.9120, 'LV.3', '180,000 MNT / 객실 · 박', '숙소 정보', 'ACTIVE', 10, NOW(3), NOW(3)),
('cpl_camp_b', 'PL-002', '미니사막 B캠프', 'LODGING', '몽골', 'crg_central', 'cpl_mini_desert', 47.8480, 106.9050, 'LV.4', '요금 미등록', '연결 없음', 'ACTIVE', 11, NOW(3), NOW(3)),
('cpl_atv', 'PL-003', '미니사막 ATV 체험장', 'EXPERIENCE', '몽골', 'crg_central', 'cpl_mini_desert', 47.8525, 106.9180, NULL, NULL, '연결 없음', 'ACTIVE', 20, NOW(3), NOW(3)),
('cpl_camel', 'PL-004', '미니사막 낙타 체험장', 'EXPERIENCE', '몽골', 'crg_central', 'cpl_mini_desert', 47.8495, 106.9200, NULL, NULL, '연결 없음', 'ACTIVE', 21, NOW(3), NOW(3)),
('cpl_sandboard', 'PL-005', '미니사막 모래썰매 체험장', 'EXPERIENCE', '몽골', 'crg_central', 'cpl_mini_desert', NULL, NULL, NULL, NULL, '연결 없음', 'ACTIVE', 22, NOW(3), NOW(3)),
('cpl_meeting', 'PL-006', '공동 미팅 장소', 'MEETING', '몽골', 'crg_central', 'cpl_ulaanbaatar', 47.9180, 106.9170, NULL, NULL, '연결 없음', 'ACTIVE', 30, NOW(3), NOW(3)),
('cpl_gate_a', 'PL-007', 'A캠프 차량 출입구', 'GATE', '몽골', 'crg_central', 'cpl_camp_a', 47.8505, 106.9100, NULL, NULL, '연결 없음', 'ACTIVE', 40, NOW(3), NOW(3));

INSERT INTO `CatalogRoute` (`id`, `code`, `name`, `regionId`, `fromPlaceId`, `toPlaceId`, `averageDistanceKm`, `averageTravelHours`, `status`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('crt_ub_mini', 'RT-001', '울란바토르 → 미니사막', 'crg_central', 'cpl_ulaanbaatar', 'cpl_mini_desert', 240, 4, 'ACTIVE', 1, NOW(3), NOW(3)),
('crt_meet_camp_a', 'RT-002', '공동 미팅 장소 → 미니사막 A캠프', 'crg_central', 'cpl_meeting', 'cpl_camp_a', 245, 4.2, 'ACTIVE', 2, NOW(3), NOW(3));

INSERT INTO `CatalogElement` (`id`, `code`, `name`, `version`, `composition`, `kind`, `defaultPlaceId`, `defaultPlaceMode`, `durationText`, `costRuleText`, `customerText`, `valueStatusText`, `usageCount`, `status`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('cel_guide_meet', 'EL-001', '가이드 미팅', 2, 'SINGLE', 'MEETING', NULL, '배치 위치 참조', '15분 고정', '미설정', '가이드와 미팅', '설정됨', 4, 'ACTIVE', 1, NOW(3), NOW(3)),
('cel_vehicle', 'EL-010', '차량 이동', 1, 'SINGLE', 'TRANSFER', NULL, '주변 장소 참조', '경로로 계산', '차량 · 경로로 계산', '차량으로 이동', '설정 중', 12, 'ACTIVE', 2, NOW(3), NOW(3)),
('cel_lunch', 'EL-021', '점심식사', 0, 'SINGLE', 'MEAL', NULL, '배치 위치 참조', '60분 고정', '참여 인원 × 단가', '현지 식당에서 점심식사', '설정됨', 8, 'ACTIVE', 3, NOW(3), NOW(3)),
('cel_camel', 'EL-032', '미니사막 낙타 체험', 0, 'SINGLE', 'EXPERIENCE', 'cpl_camel', NULL, '60분 고정', '참여 인원 × 단가', '미니사막에서 낙타 체험', '설정 중', 3, 'ACTIVE', 4, NOW(3), NOW(3)),
('cel_atv', 'EL-033', '미니사막 ATV 체험', 1, 'SINGLE', 'EXPERIENCE', 'cpl_atv', NULL, '45분 고정', '참여 인원 × 단가', '미니사막에서 ATV 체험', '설정됨', 5, 'ACTIVE', 5, NOW(3), NOW(3)),
('cel_sandboard', 'EL-034', '미니사막 모래썰매', 0, 'SINGLE', 'EXPERIENCE', 'cpl_sandboard', NULL, '30분 고정', '참여 인원 × 단가', '미니사막에서 모래썰매', '설정 중', 2, 'ACTIVE', 6, NOW(3), NOW(3)),
('cel_set_tour', 'ES-004', '미니사막 투어', 4, 'SET', 'EXPERIENCE', 'cpl_mini_desert', NULL, '순차 기준', '구성요소 합산', '미니사막 체험 투어', '설정됨', 6, 'ACTIVE', 7, NOW(3), NOW(3)),
('cel_set_mixed', 'ES-005', '미니사막 투어+점심', 1, 'SET', 'MIXED', 'cpl_mini_desert', NULL, '순차 기준', '구성요소 합산', '미니사막 투어 후 점심', '설정 중', 1, 'ACTIVE', 8, NOW(3), NOW(3));

INSERT INTO `CatalogElementItem` (`id`, `setElementId`, `memberElementId`, `orderIndex`, `createdAt`, `updatedAt`) VALUES
('cei_1', 'cel_set_tour', 'cel_camel', 0, NOW(3), NOW(3)),
('cei_2', 'cel_set_tour', 'cel_atv', 1, NOW(3), NOW(3)),
('cei_3', 'cel_set_tour', 'cel_sandboard', 2, NOW(3), NOW(3)),
('cei_4', 'cel_set_mixed', 'cel_set_tour', 0, NOW(3), NOW(3)),
('cei_5', 'cel_set_mixed', 'cel_lunch', 1, NOW(3), NOW(3));

INSERT INTO `CatalogBlock` (`id`, `code`, `name`, `version`, `shape`, `dayCount`, `fromLabel`, `toLabel`, `compositionText`, `distanceKm`, `travelHours`, `timeSaturationPct`, `timeSaturationText`, `fatigueScore`, `estimatedCostText`, `calcStatusText`, `usageCount`, `status`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
('cbl_ub_mini', 'BL-001', '울란바토르 → 미니사막', 2, 'DAY', 1, '도시 미팅 장소', '미니사막 A캠프', '단일 8 · 세트 1', 240, 4, 80, '8/10시간', 0.40, '1,260,000 MNT', '계산됨', 3, 'ACTIVE', 1, NOW(3), NOW(3)),
('cbl_mini_day', 'BL-002', '미니사막 체류일', 1, 'DAY', 1, '미니사막 A캠프', '미니사막 A캠프', '단일 5 · 세트 1', 12, 1.5, 70, '7/10시간', 0.25, '840,000 MNT', '계산됨', 4, 'ACTIVE', 2, NOW(3), NOW(3)),
('cbl_mini_ub', 'BL-003', '미니사막 → 울란바토르', 1, 'DAY', 1, '미니사막 A캠프', '도시 미팅 장소', '단일 6 · 세트 0', 240, 4, 75, '7.5/10시간', 0.45, '980,000 MNT', '운영 확인 필요', 2, 'ACTIVE', 3, NOW(3), NOW(3)),
('cbl_train_dep', 'BL-010', '열차 출발일', 0, 'DAY', 1, '울란바토르 역', '야간열차', '단일 4 · 세트 0', 0, 2, 40, '4/10시간', 0.20, '320,000 MNT', '계산됨', 1, 'ACTIVE', 10, NOW(3), NOW(3)),
('cbl_train_arr', 'BL-011', '열차 도착일', 0, 'DAY', 1, '야간열차', '달란자드가드', '단일 5 · 세트 0', 0, 3, 50, '5/10시간', 0.30, '410,000 MNT', '장소 필요', 1, 'ACTIVE', 11, NOW(3), NOW(3)),
('cbl_train_set', 'BS-001', '야간열차 이동 세트', 1, 'SET', 2, '울란바토르 역', '달란자드가드', '하루 2', 0, 5, NULL, NULL, 0.35, '730,000 MNT', '계산됨', 2, 'ACTIVE', 12, NOW(3), NOW(3));

INSERT INTO `CatalogBlockItem` (`id`, `setBlockId`, `memberBlockId`, `orderIndex`, `createdAt`, `updatedAt`) VALUES
('cbi_1', 'cbl_train_set', 'cbl_train_dep', 0, NOW(3), NOW(3)),
('cbi_2', 'cbl_train_set', 'cbl_train_arr', 1, NOW(3), NOW(3));
