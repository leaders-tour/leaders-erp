import { describe, expect, it } from 'vitest';
import { buildCustomerDeleteSummary, isCustomerDeleteConfirmationValid } from './customer-delete-summary';

describe('customer delete summary', () => {
  it('summarizes related customer-owned data counts', () => {
    const summary = buildCustomerDeleteSummary({
      name: '홍길동',
      plans: [{ id: 'plan-1' }, { id: 'plan-2' }],
      confirmedTrips: [
        { status: 'ACTIVE' },
        { status: 'CANCELLED' },
      ],
      userDealTodos: [{ id: 'todo-1' }],
    });

    expect(summary).toEqual({
      customerName: '홍길동',
      planCount: 2,
      confirmedTripCount: 2,
      activeConfirmedTripCount: 1,
      dealTodoCount: 1,
    });
  });

  it('requires exact customer name confirmation', () => {
    expect(isCustomerDeleteConfirmationValid('홍길동', '홍길동')).toBe(true);
    expect(isCustomerDeleteConfirmationValid('홍길동', ' 홍길동 ')).toBe(true);
    expect(isCustomerDeleteConfirmationValid('홍길동', '김철수')).toBe(false);
  });
});
