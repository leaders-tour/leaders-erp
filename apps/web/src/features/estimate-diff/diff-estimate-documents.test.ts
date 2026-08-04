import { describe, expect, it } from 'vitest';
import type { EstimateDocumentData, EstimatePlanStopRow } from '../estimate/model/types';
import { diffEstimateDocuments } from './diff-estimate-documents';

function baseData(overrides: Partial<EstimateDocumentData> = {}): EstimateDocumentData {
  return {
    mode: 'version',
    isDraft: false,
    planTitle: '',
    page2Title: '',
    page3Title: '',
    leaderName: '이예서',
    documentNumber: 'DOC-1',
    destinationName: '중부',
    headcountTotal: 8,
    headcountMale: 3,
    headcountFemale: 5,
    travelStartDate: '2026-09-22',
    travelEndDate: '2026-09-26',
    vehicleType: '하이에이스 1대',
    vehicleDisplayNote: null,
    transportGroups: [],
    flightInDate: '2026-09-22',
    flightInTime: '02:45',
    flightOutDate: '2026-09-26',
    flightOutTime: '18:15',
    pickupDate: '2026-09-22',
    pickupTime: '04:00',
    dropDate: '2026-09-26',
    dropTime: '15:30',
    pickupPlaceType: 'AIRPORT',
    pickupPlaceCustomText: null,
    dropPlaceType: 'AIRPORT',
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
    rentalItemsText: '판초 8개',
    eventText: '',
    remarkText: '',
    basePricePerPersonKrw: 891000,
    adjustmentLines: [],
    teamPricings: [],
    totalPricePerPersonKrw: 921000,
    depositPricePerPersonKrw: 91000,
    balancePricePerPersonKrw: 830000,
    securityDepositTotalKrw: 240000,
    securityDepositUnitKrw: 30000,
    securityDepositScope: '인당',
    validUntilDate: null,
    planStops: [],
    estimateGuideImagesPerPage: 2,
    estimateGuidePageSplits: null,
    page3Blocks: [],
    ...overrides,
  };
}

function stop(partial: Partial<EstimatePlanStopRow> & Pick<EstimatePlanStopRow, 'dateCellText' | 'destinationCellText'>): EstimatePlanStopRow {
  return {
    rowType: 'MAIN',
    locationId: 'loc-1',
    timeCellText: '08:00',
    scheduleCellText: '일정',
    lodgingCellText: '캠프',
    mealCellText: '아침 X\n점심 식당\n저녁 캠프',
    ...partial,
  };
}

describe('diffEstimateDocuments', () => {
  it('Page1 필드 변경을 changed로 표시한다', () => {
    const previous = baseData({ leaderName: '이예서', headcountTotal: 8 });
    const next = baseData({ leaderName: '김리더', headcountTotal: 9, headcountMale: 4, headcountFemale: 5 });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page1.leaderName).toBe('changed');
    expect(hints.page1.headcount).toBe('changed');
    expect(hints.page1.destinationName).toBeUndefined();
  });

  it('문서번호가 양쪽 비어 있으면 동일로 본다', () => {
    const previous = baseData({ documentNumber: null });
    const next = baseData({ documentNumber: '   ', isDraft: true });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page1.documentNumber).toBeUndefined();
  });

  it('Page2 셀 텍스트 차이를 양쪽에 changed로 표시한다', () => {
    const previous = baseData({
      planStops: [stop({ locationId: 'a', dateCellText: '1일차', destinationCellText: '어기호수', scheduleCellText: '투어' })],
    });
    const next = baseData({
      planStops: [stop({ locationId: 'a', dateCellText: '1일차', destinationCellText: '어기호수', scheduleCellText: '자유시간' })],
    });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page2Previous[0]?.schedule).toBe('changed');
    expect(hints.page2Next[0]?.schedule).toBe('changed');
    expect(hints.page2Previous[0]?.date).toBeUndefined();
  });

  it('행 추가/삭제를 added/removed로 표시한다', () => {
    const previous = baseData({
      planStops: [
        stop({ locationId: 'a', dateCellText: '1일차', destinationCellText: 'A' }),
        stop({ locationId: 'b', dateCellText: '2일차', destinationCellText: 'B' }),
      ],
    });
    const next = baseData({
      planStops: [
        stop({ locationId: 'a', dateCellText: '1일차', destinationCellText: 'A' }),
        stop({ locationId: 'c', dateCellText: '2일차', destinationCellText: 'C' }),
      ],
    });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page2Previous[1]?.date).toBe('removed');
    expect(hints.page2Next[1]?.date).toBe('added');
  });

  it('식사 prefix 차이는 무시한다', () => {
    const previous = baseData({
      planStops: [stop({ locationId: 'a', dateCellText: '1일차', destinationCellText: 'A', mealCellText: '아침 X\n점심 식당' })],
    });
    const next = baseData({
      planStops: [stop({ locationId: 'a', dateCellText: '1일차', destinationCellText: 'A', mealCellText: 'X\n식당' })],
    });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page2Previous[0]?.meal).toBeUndefined();
  });

  it('단일 팀에서 화면에 안 보이는 adjustment teamName 차이는 무시한다', () => {
    const line = {
      label: '얼리스타트 (04~)',
      leadAmountKrw: 30000,
      formula: '240,000원/8인',
      strikethrough: false,
    };
    const previous = baseData({
      teamPricings: [],
      adjustmentLines: [{ ...line, teamName: null }],
    });
    const next = baseData({
      teamPricings: [],
      adjustmentLines: [{ ...line, teamName: 'A팀' }],
    });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page1.adjustments).toBeUndefined();
  });

  it('팀 분리 후에도 표시 금액이 같으면 가격 셀을 변경으로 보지 않는다', () => {
    const previous = baseData({
      basePricePerPersonKrw: 1_104_000,
      totalPricePerPersonKrw: 1_226_000,
      depositPricePerPersonKrw: 96_000,
      balancePricePerPersonKrw: 1_030_000,
      securityDepositUnitKrw: 30_000,
      securityDepositScope: '인당',
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          baseAmountKrw: 1_104_000,
          totalAmountKrw: 1_226_000,
          depositAmountKrw: 96_000,
          balanceAmountKrw: 1_030_000,
          securityDepositAmountKrw: 180_000,
          securityDepositUnitKrw: 30_000,
          securityDepositScope: '인당',
        },
      ],
      adjustmentLines: [
        {
          teamName: null,
          label: '얼리스타트 (04~)',
          leadAmountKrw: 40_000,
          formula: '240,000원/6인',
          strikethrough: false,
        },
      ],
    });
    const next = baseData({
      basePricePerPersonKrw: 1_104_000,
      totalPricePerPersonKrw: 1_226_000,
      depositPricePerPersonKrw: 96_000,
      balancePricePerPersonKrw: 1_030_000,
      securityDepositUnitKrw: 30_000,
      securityDepositScope: '인당',
      teamPricings: [
        {
          teamOrderIndex: 0,
          teamName: 'A팀',
          baseAmountKrw: 1_104_000,
          totalAmountKrw: 1_226_000,
          depositAmountKrw: 96_000,
          balanceAmountKrw: 1_030_000,
          securityDepositAmountKrw: 90_000,
          securityDepositUnitKrw: 30_000,
          securityDepositScope: '인당',
        },
        {
          teamOrderIndex: 1,
          teamName: 'B팀',
          baseAmountKrw: 1_104_000,
          totalAmountKrw: 1_226_000,
          depositAmountKrw: 96_000,
          balanceAmountKrw: 1_030_000,
          securityDepositAmountKrw: 90_000,
          securityDepositUnitKrw: 30_000,
          securityDepositScope: '인당',
        },
      ],
      adjustmentLines: [
        {
          teamName: null,
          label: '얼리스타트 (04~)',
          leadAmountKrw: 40_000,
          formula: '240,000원/6인',
          strikethrough: false,
        },
      ],
    });

    const hints = diffEstimateDocuments(previous, next);

    expect(hints.page1.basePrice).toBeUndefined();
    expect(hints.page1.totalPrice).toBeUndefined();
    expect(hints.page1.depositPrice).toBeUndefined();
    expect(hints.page1.balancePrice).toBeUndefined();
    expect(hints.page1.securityDeposit).toBeUndefined();
    expect(hints.page1.adjustments).toBeUndefined();
  });
});
