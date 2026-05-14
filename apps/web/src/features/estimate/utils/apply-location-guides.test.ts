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
});
