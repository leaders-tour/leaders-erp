import { describe, expect, it } from 'vitest';
import { getUserDocumentNumbers, matchesCustomerSearchKeyword } from './customerSearch';
import type { UserRow } from './hooks';

function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    ownerEmployeeId: 'emp-1',
    ownerEmployee: {
      id: 'emp-1',
      name: '김담당',
      email: 'owner@example.com',
      role: 'STAFF',
      isActive: true,
    },
    dealStage: 'CONTRACT_CONFIRMED',
    dealStageOrder: 0,
    attachments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('customerSearch', () => {
  it('matches document number with partial keyword', () => {
    const user = buildUser({
      plans: [
        {
          id: 'plan-1',
          currentVersion: {
            id: 'version-1',
            meta: { documentNumber: '260101001V1' },
          },
        },
      ],
    });

    expect(matchesCustomerSearchKeyword(user, '260101001')).toBe(true);
    expect(matchesCustomerSearchKeyword(user, '260101001v1')).toBe(true);
    expect(matchesCustomerSearchKeyword(user, '999999')).toBe(false);
  });

  it('collects document numbers from all plans', () => {
    const user = buildUser({
      plans: [
        {
          id: 'plan-1',
          currentVersion: { meta: { documentNumber: '260101001V1' } },
        },
        {
          id: 'plan-2',
          currentVersion: { meta: { documentNumber: '260202002V2' } },
        },
      ],
    });

    expect(getUserDocumentNumbers(user)).toEqual(['260101001V1', '260202002V2']);
    expect(matchesCustomerSearchKeyword(user, '260202002')).toBe(true);
  });

  it('still matches name and owner fields', () => {
    const user = buildUser();

    expect(matchesCustomerSearchKeyword(user, '홍길')).toBe(true);
    expect(matchesCustomerSearchKeyword(user, '김담당')).toBe(true);
    expect(matchesCustomerSearchKeyword(user, 'owner@example.com')).toBe(true);
  });
});
