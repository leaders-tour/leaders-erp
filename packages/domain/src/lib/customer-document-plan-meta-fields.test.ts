import { describe, expect, it } from 'vitest';
import {
  buildCustomerDocumentExternalPickupDropText,
  buildPlanVersionCustomerDocumentSharedFields,
} from './customer-document-plan-meta-fields';
import { resolveCustomerDocumentBalanceDisplayLines } from './customer-document-balance-display';

const transportGroups = [
  {
    teamName: 'A팀',
    headcount: 1,
    flightInDate: null,
    flightInTime: null,
    flightOutDate: '2026-07-19',
    flightOutTime: '08:40',
    pickupDate: '2026-07-12',
    pickupTime: '05:00',
    pickupPlaceType: 'ULAANBAATAR',
    pickupPlaceCustomText: null,
    dropDate: '2026-07-18',
    dropTime: '19:00',
    dropPlaceType: 'ULAANBAATAR',
    dropPlaceCustomText: null,
  },
  {
    teamName: 'B팀',
    headcount: 7,
    flightInDate: '2026-07-12',
    flightInTime: '02:45',
    flightOutDate: '2026-07-19',
    flightOutTime: '08:40',
    pickupDate: '2026-07-12',
    pickupTime: '04:00',
    pickupPlaceType: 'AIRPORT',
    pickupPlaceCustomText: null,
    dropDate: '2026-07-18',
    dropTime: '19:00',
    dropPlaceType: 'ULAANBAATAR',
    dropPlaceCustomText: null,
  },
];

describe('buildCustomerDocumentExternalPickupDropText', () => {
  it('reads externalTransfers before legacy pickup/drop fields', () => {
    expect(
      buildCustomerDocumentExternalPickupDropText({
        externalTransfers: [{
          direction: 'DROP',
          presetCode: 'DROP_ULAANBAATAR_AIRPORT',
          travelDate: '2026-07-19T00:00:00.000Z',
          departureTime: '04:00',
          arrivalTime: '05:30',
          departurePlace: '울란바토르',
          arrivalPlace: '공항',
          selectedTeamOrderIndexes: [0, 1],
        }],
        transportGroups,
        externalPickupDate: null,
        externalPickupTime: null,
        externalPickupPlaceType: null,
        externalPickupPlaceCustomText: null,
        externalDropDate: null,
        externalDropTime: null,
        externalDropPlaceType: null,
        externalDropPlaceCustomText: null,
        externalPickupDropNote: null,
      }),
    ).toBe(
      'A팀 07/19 04:00 울란바토르 > 05:30 공항\nB팀 07/19 04:00 울란바토르 > 05:30 공항',
    );
  });
});

describe('resolveCustomerDocumentBalanceDisplayLines', () => {
  it('prefers team pricing rows over headline snapshot balance', () => {
    expect(
      resolveCustomerDocumentBalanceDisplayLines({
        baseAmountKrw: 1_139_000,
        totalAmountKrw: 1_281_500,
        depositAmountKrw: 81_500,
        balanceAmountKrw: 1_200_000,
        securityDepositAmountKrw: 30_000,
        securityDepositUnitPriceKrw: 30_000,
        securityDepositMode: 'PER_PERSON',
        manualPricingSnapshot: {
          customerPricingSnapshot: {
            baseAmountKrw: 1_139_000,
            totalAmountKrw: 1_264_000,
            depositAmountKrw: 124_000,
            balanceAmountKrw: 1_140_000,
            securityDepositTotalKrw: 240_000,
            securityDepositUnitKrw: 30_000,
            securityDepositMode: 'PER_PERSON',
            adjustmentLines: [],
            teamPricings: [
              {
                teamOrderIndex: 0,
                teamName: 'A팀',
                totalAmountKrw: 1_281_500,
                depositAmountKrw: 81_500,
                balanceAmountKrw: 1_200_000,
                securityDepositAmountKrw: 30_000,
                securityDepositUnitKrw: 30_000,
                securityDepositScope: '인당',
              },
              {
                teamOrderIndex: 1,
                teamName: 'B팀',
                totalAmountKrw: 1_281_500,
                depositAmountKrw: 81_500,
                balanceAmountKrw: 1_200_000,
                securityDepositAmountKrw: 210_000,
                securityDepositUnitKrw: 30_000,
                securityDepositScope: '인당',
              },
            ],
          },
        },
      }),
    ).toEqual([
      { teamName: null, balanceAmountKrw: 1_200_000 },
    ]);
  });
});

describe('buildPlanVersionCustomerDocumentSharedFields', () => {
  it('formats events with slash separator like estimate page 1', () => {
    const fields = buildPlanVersionCustomerDocumentSharedFields({
      leaderName: '장여진',
      documentNumber: '260712815V2',
      regionSetName: '고비 + 테를지',
      headcountTotal: 8,
      headcountMale: 4,
      headcountFemale: 4,
      travelStartDate: '2026-07-12',
      travelEndDate: '2026-07-18',
      vehicleTypeDisplay: '스타리아',
      includeRentalItems: true,
      rentalItemsText: '카메라',
      specialNote: '특이',
      remark: '비고',
      eventNames: ['카라반', '별빛'],
      transportGroups,
      externalTransfers: [],
      externalPickupDate: null,
      externalPickupTime: null,
      externalPickupPlaceType: null,
      externalPickupPlaceCustomText: null,
      externalDropDate: null,
      externalDropTime: null,
      externalDropPlaceType: null,
      externalDropPlaceCustomText: null,
      externalPickupDropNote: null,
      pricing: null,
    });

    expect(fields.eventNames).toBe('카라반 / 별빛');
    expect(fields.headcountText).toBe('8인 (남4/여4)');
  });
});
