import { describe, expect, it } from 'vitest';
import { applyLocationGuides, normalizeGuideSubLocationDedupeKey } from './apply-location-guides';
import type { EstimateDocumentData } from '../model/types';

describe('normalizeGuideSubLocationDedupeKey', () => {
  it('앞뒤 공백과 연속 공백을 정규화한다', () => {
    expect(normalizeGuideSubLocationDedupeKey('  욜린암 ')).toBe(normalizeGuideSubLocationDedupeKey('욜린암'));
  });
});

describe('applyLocationGuides', () => {
  const baseData = (): EstimateDocumentData => ({
    mode: 'version',
    isDraft: false,
    planTitle: '',
    page2Title: '',
    page3Title: '',
    leaderName: '',
    documentNumber: null,
    destinationName: '',
    headcountTotal: null,
    headcountMale: null,
    headcountFemale: null,
    travelStartDate: null,
    travelEndDate: null,
    vehicleType: '',
    transportGroups: [],
    flightInDate: null,
    flightInTime: null,
    flightOutDate: null,
    flightOutTime: null,
    pickupDate: null,
    pickupTime: null,
    dropDate: null,
    dropTime: null,
    pickupPlaceType: null,
    pickupPlaceCustomText: null,
    dropPlaceType: null,
    dropPlaceCustomText: null,
    externalTransfers: [],
    externalPickupDate: null,
    externalPickupTime: null,
    externalPickupPlaceType: null,
    externalPickupPlaceCustomText: null,
    externalDropDate: null,
    externalDropTime: null,
    externalDropPlaceType: null,
    externalDropPlaceCustomText: null,
    pickupText: '',
    dropText: '',
    externalPickupText: '',
    externalDropText: '',
    externalPickupDropText: '',
    specialNoteText: '',
    rentalItemsText: '',
    eventText: '',
    remarkText: '',
    basePricePerPersonKrw: null,
    adjustmentLines: [],
    teamPricings: [],
    totalPricePerPersonKrw: null,
    depositPricePerPersonKrw: null,
    balancePricePerPersonKrw: null,
    securityDepositTotalKrw: null,
    securityDepositUnitKrw: null,
    securityDepositScope: '-',
    validUntilDate: null,
    planStops: [],
    estimateGuideImagesPerPage: 2,
    estimateGuidePageSplits: null,
    page3Blocks: [],
  });

  it('같은 하위 목적지명은 한 번만 출력한다', () => {
    const locA = 'loc-a';
    const locB = 'loc-b';
    const out = applyLocationGuides(
      {
        ...baseData(),
        planStops: [
          {
            rowType: 'MAIN',
            locationId: locA,
            dateCellText: '',
            destinationCellText: '',
            timeCellText: '',
            scheduleCellText: '',
            lodgingCellText: '',
            mealCellText: '',
          },
          {
            rowType: 'MAIN',
            locationId: locB,
            dateCellText: '',
            destinationCellText: '',
            timeCellText: '',
            scheduleCellText: '',
            lodgingCellText: '',
            mealCellText: '',
          },
        ],
      },
      [
        {
          id: 'g1',
          title: '',
          description: '',
          locationId: locA,
          imageUrls: ['http://a1', 'http://a2'],
          location: { id: locA, name: ['차강소브라가', '욜린암'] },
        },
        {
          id: 'g2',
          title: '',
          description: '',
          locationId: locB,
          imageUrls: ['http://b1', 'http://b2'],
          location: { id: locB, name: ['욜린암', '홍고린엘스'] },
        },
      ],
    );

    expect(out.page3Blocks.map((b) => b.locationName)).toEqual(['차강소브라가', '욜린암', '홍고린엘스']);
    expect(out.page3Blocks.map((b) => b.imageUrls[0])).toEqual(['http://a1', 'http://a2', 'http://b2']);
  });

  it('앞 줄 imageUrls 인덱스가 비워져 있어도 뒤 줄 URL은 뒷줄 이름에 매칭된다', () => {
    const locId = 'loc-single';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: locId,
      dateCellText: '',
      destinationCellText: '',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'gx',
          title: '',
          description: '',
          locationId: locId,
          imageUrls: ['', 'http://second-line-only'],
          location: { id: locId, name: ['차강소브라가', '욜린암'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(1);
    const sole = out.page3Blocks[0];
    expect(sole?.locationName).toBe('욜린암');
    expect(sole?.imageUrls[0]).toBe('http://second-line-only');
  });

  it('단일 줄 경유지만 일부 세그먼트에 해당하는 단일 목적지 가이드가 있으면 전체 레거시 경로를 쓴다', () => {
    const locCombo = 'loc-combo';
    const locC = 'loc-c';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: locCombo,
      dateCellText: '',
      destinationCellText: '',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'combo',
          title: '',
          description: '',
          locationId: locCombo,
          imageUrls: ['http://fallback-line'],
          location: { id: locCombo, name: ['차강 / 욜린암'] },
        },
        {
          id: 'sg-c',
          title: '',
          description: '',
          locationId: locC,
          imageUrls: ['http://c-only'],
          location: { id: locC, name: ['차강'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(1);
    expect(out.page3Blocks[0]?.locationName).toBe('차강 / 욜린암');
    expect(out.page3Blocks[0]?.imageUrls[0]).toBe('http://fallback-line');
    expect(out.page3Blocks[0]?.locationId).toBe(locCombo);
  });

  it('한 줄 경유 레거시에 세그먼트 수만큼 이미지가 있으면 (단일 조합 불가 시) 순서대로 분리된다', () => {
    const locCombo = 'loc-combo-slash-legacy';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: locCombo,
      dateCellText: '',
      destinationCellText: '',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'combo',
          title: '',
          description: '',
          locationId: locCombo,
          imageUrls: ['http://c-legacy', 'http://y-legacy'],
          location: { id: locCombo, name: ['차강 / 욜린암'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(2);
    expect(out.page3Blocks.map((b) => b.locationName)).toEqual(['차강', '욜린암']);
    expect(out.page3Blocks.map((b) => b.imageUrls[0])).toEqual(['http://c-legacy', 'http://y-legacy']);
    expect(out.page3Blocks.map((b) => b.locationId)).toEqual([locCombo, locCombo]);
  });

  it('locationId 필드 없이 포함된 location.id만 있어도 스톱 locationId와 연결된다', () => {
    const locReal = 'loc-real-from-nested';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: locReal,
      dateCellText: '',
      destinationCellText: '',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'guide-nested-only',
          title: '',
          description: '',
          locationId: null,
          imageUrls: ['http://nested'],
          location: { id: locReal, name: ['테를지 캠프'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(1);
    expect(out.page3Blocks[0]?.imageUrls[0]).toBe('http://nested');
    expect(out.page3Blocks[0]?.locationId).toBe(locReal);
  });

  it('두 줄 목적지(경유)—합성에는 욜린암 이미지가 비어 있어도 단일 욜린암 가이드가 있으면 나눠 채운다', () => {
    const comboLocId = 'loc-trip-combo-two-lines';
    const yolinLocId = 'loc-yolin-only';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: comboLocId,
      dateCellText: '',
      destinationCellText: '',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'combo',
          title: '합성',
          description: '',
          locationId: comboLocId,
          imageUrls: ['http://c-combo-only', ''],
          location: { id: comboLocId, name: ['차강소브라가', '욜린암'] },
        },
        {
          id: 'sg-yolin',
          title: '야',
          description: '',
          locationId: yolinLocId,
          imageUrls: ['http://y-single'],
          location: { id: yolinLocId, name: ['욜린암'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(2);
    expect(out.page3Blocks.map((b) => b.locationName.trim())).toEqual(['차강소브라가', '욜린암']);
    expect(out.page3Blocks.map((b) => b.imageUrls[0])).toEqual(['http://c-combo-only', 'http://y-single']);
    expect(out.page3Blocks.map((b) => b.locationId)).toEqual([comboLocId, yolinLocId]);
  });

  it('스톱 locationId에 직접 가이드가 없으면 목적지 셀의 여러 줄을 단일 가이드로 붙인다', () => {
    const comboLocId = 'loc-combo-no-guide';
    const locC = 'loc-c-single';
    const locY = 'loc-y-single';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: comboLocId,
      dateCellText: '',
      destinationCellText: '차강소브라가\n욜린암\n이동 1시간\n(50 km)',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'sg-c',
          title: '차강',
          description: '',
          locationId: locC,
          imageUrls: ['http://c-single'],
          location: { id: locC, name: ['차강소브라가'] },
        },
        {
          id: 'sg-y',
          title: '욜린',
          description: '',
          locationId: locY,
          imageUrls: ['http://y-single'],
          location: { id: locY, name: ['욜린암'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(2);
    expect(out.page3Blocks.map((b) => b.locationName)).toEqual(['차강소브라가', '욜린암']);
    expect(out.page3Blocks.map((b) => b.imageUrls[0])).toEqual(['http://c-single', 'http://y-single']);
    expect(out.page3Blocks.map((b) => b.locationId)).toEqual([locC, locY]);
  });

  it('플랜 locationId와 가이드가 어긋나도 목적지 셀 라벨이 Location 이름과 맞으면 가이드를 붙인다', () => {
    const bogusStopId = 'wrong-stop-location-id';
    const guideLocId = 'loc-gobi-spot';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: bogusStopId,
      dateCellText: '',
      destinationCellText: '차강소브라가 (이동)\n추가',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'g-spot',
          title: '',
          description: '',
          locationId: guideLocId,
          imageUrls: ['http://by-label'],
          location: { id: guideLocId, name: ['차강소브라가'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(1);
    expect(out.page3Blocks[0]?.imageUrls[0]).toBe('http://by-label');
    expect(out.page3Blocks[0]?.locationId).toBe(guideLocId);
    expect(out.page3Blocks[0]?.locationName.trim()).toBe('차강소브라가');
  });

  it('경유 줄 세그먼트마다 단일 목적지 가이드가 있으면 그 이미지로 조합한다', () => {
    const locCombo = 'loc-combo';
    const locC = 'loc-c';
    const locY = 'loc-y';
    const mainStop = {
      rowType: 'MAIN' as const,
      locationId: locCombo,
      dateCellText: '',
      destinationCellText: '',
      timeCellText: '',
      scheduleCellText: '',
      lodgingCellText: '',
      mealCellText: '',
    };
    const out = applyLocationGuides(
      { ...baseData(), planStops: [mainStop] },
      [
        {
          id: 'combo',
          title: '콤보',
          description: '',
          locationId: locCombo,
          imageUrls: [],
          location: { id: locCombo, name: ['차강 / 욜린암'] },
        },
        {
          id: 'sg-c',
          title: '가',
          description: '',
          locationId: locC,
          imageUrls: ['http://c-guide'],
          location: { id: locC, name: ['차강'] },
        },
        {
          id: 'sg-y',
          title: '야',
          description: '',
          locationId: locY,
          imageUrls: ['http://y-guide'],
          location: { id: locY, name: ['욜린암'] },
        },
      ],
    );

    expect(out.page3Blocks).toHaveLength(2);
    expect(out.page3Blocks.map((b) => b.locationName)).toEqual(['차강', '욜린암']);
    expect(out.page3Blocks.map((b) => b.imageUrls[0])).toEqual(['http://c-guide', 'http://y-guide']);
    expect(out.page3Blocks.map((b) => b.locationId)).toEqual([locC, locY]);
    expect(out.page3Blocks[0]?.title).toBe('가');
    expect(out.page3Blocks[1]?.title).toBe('야');
  });
});
