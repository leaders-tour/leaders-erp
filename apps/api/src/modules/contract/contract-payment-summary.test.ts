import { describe, expect, it } from 'vitest';
import { buildDocumentPaymentReviewSummary } from './contract-payment-summary';

describe('buildDocumentPaymentReviewSummary', () => {
  it('builds member deposits and team totals from matched receipts', () => {
    const summary = buildDocumentPaymentReviewSummary({
      planVersion: {
        id: 'pv-1',
        meta: { headcountTotal: 2 },
        pricing: {
          depositAmountKrw: 100_000,
          securityDepositAmountKrw: 30_000,
          securityDepositUnitPriceKrw: 30_000,
          securityDepositMode: 'PER_PERSON',
          inputSnapshot: {},
          manualPricingSnapshot: {
            customerPricingSnapshot: {
              depositAmountKrw: 100_000,
              securityDepositMode: 'PER_PERSON',
              securityDepositUnitKrw: 30_000,
            },
          },
        },
      },
      teamMemberNames: ['박성준', '우민지'],
      matchedReceipts: [
        { payerNameRaw: '박성준', payerNameNorm: '박성준', amountKrw: 130_000 },
      ],
    });

    expect(summary.requiredTotalKrw).toBe(260_000);
    expect(summary.receivedTotalKrw).toBe(130_000);
    expect(summary.remainingTotalKrw).toBe(130_000);
    expect(summary.memberDeposits).toEqual([
      { name: '박성준', receivedAmountKrw: 130_000, requiredReferenceAmountKrw: 130_000 },
      { name: '우민지', receivedAmountKrw: 0, requiredReferenceAmountKrw: 130_000 },
    ]);
  });
});
