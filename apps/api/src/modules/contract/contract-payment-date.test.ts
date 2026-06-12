import { describe, expect, it } from 'vitest';
import { parsePaymentReceivedAtFromRawJson } from './contract-payment-date';

describe('parsePaymentReceivedAtFromRawJson', () => {
  it('uses 타임스템프 typo column year for yearless 입금일시', () => {
    const parsed = parsePaymentReceivedAtFromRawJson({
      금액: ' ₩ 90,000.00 ',
      입금일시: '04/07 16:29',
      입금자명: '이승현',
      타임스템프: '2025. 4. 7 오후 4:29:29',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2025);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(7);
    expect(parsed?.getHours()).toBe(16);
    expect(parsed?.getMinutes()).toBe(29);
  });

  it('still reads 표준 타임스탬프 column', () => {
    const parsed = parsePaymentReceivedAtFromRawJson({
      입금일시: '04/07 16:29',
      타임스탬프: '2025. 4. 7. 오후 4:29:29',
    });

    expect(parsed?.getFullYear()).toBe(2025);
  });
});
