import { describe, expect, it, vi } from 'vitest';
import {
  assertUserDeletable,
  collectUserDeleteGraphIds,
  deleteUserOwnedGraph,
  unlinkExternalMatchReferences,
  UserDeleteIncompleteError,
  type UserDeleteGraphIds,
} from './delete-user';

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    plan: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    planVersion: {
      deleteMany: vi.fn(),
    },
    confirmedTrip: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    calendarNote: {
      deleteMany: vi.fn(),
    },
    contractDocumentStatus: {
      updateMany: vi.fn(),
    },
    contractPaymentStatus: {
      updateMany: vi.fn(),
    },
    userNote: {
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    userDealTodo: {
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    ...overrides,
  };
}

describe('collectUserDeleteGraphIds', () => {
  it('returns null when user does not exist', async () => {
    const tx = makeTx();
    tx.user.findUnique.mockResolvedValue(null);

    const result = await collectUserDeleteGraphIds(tx as never, 'user-1');
    expect(result).toBeNull();
  });

  it('collects plan, version, and confirmed trip ids including plan graph links', async () => {
    const tx = makeTx();
    tx.user.findUnique.mockResolvedValue({ id: 'user-1' });
    tx.plan.findMany.mockResolvedValue([
      { id: 'plan-1', versions: [{ id: 'version-1' }, { id: 'version-2' }] },
      { id: 'plan-2', versions: [{ id: 'version-3' }] },
    ]);
    tx.confirmedTrip.findMany
      .mockResolvedValueOnce([{ id: 'trip-1' }])
      .mockResolvedValueOnce([{ id: 'trip-2' }, { id: 'trip-1' }]);

    const result = await collectUserDeleteGraphIds(tx as never, 'user-1');

    expect(result).toEqual({
      userId: 'user-1',
      planIds: ['plan-1', 'plan-2'],
      planVersionIds: ['version-1', 'version-2', 'version-3'],
      confirmedTripIds: ['trip-1', 'trip-2'],
    });
  });
});

describe('unlinkExternalMatchReferences', () => {
  it('clears contract and payment match references without deleting source rows', async () => {
    const tx = makeTx();
    const ids: UserDeleteGraphIds = {
      userId: 'user-1',
      planIds: ['plan-1'],
      planVersionIds: ['version-1', 'version-2'],
      confirmedTripIds: ['trip-1'],
    };

    await unlinkExternalMatchReferences(tx as never, ids);

    expect(tx.contractDocumentStatus.updateMany).toHaveBeenCalledTimes(3);
    expect(tx.contractPaymentStatus.updateMany).toHaveBeenCalledWith({
      where: { matchedPlanVersionId: { in: ['version-1', 'version-2'] } },
      data: { matchedPlanVersionId: null },
    });
  });
});

describe('deleteUserOwnedGraph', () => {
  it('clears plan versions before deleting plans and finally the user', async () => {
    const tx = makeTx();
    const callOrder: string[] = [];
    tx.calendarNote.deleteMany.mockImplementation(async () => {
      callOrder.push('calendarNote');
    });
    tx.confirmedTrip.findMany.mockResolvedValue([]);
    tx.confirmedTrip.deleteMany.mockImplementation(async () => {
      callOrder.push('confirmedTrip');
    });
    tx.confirmedTrip.count.mockResolvedValue(0);
    tx.plan.updateMany.mockImplementation(async () => {
      callOrder.push('planCurrentVersionNull');
    });
    tx.planVersion.deleteMany.mockImplementation(async () => {
      callOrder.push('planVersion');
    });
    tx.plan.deleteMany.mockImplementation(async () => {
      callOrder.push('plan');
    });
    tx.userNote.deleteMany.mockImplementation(async () => {
      callOrder.push('userNote');
    });
    tx.userDealTodo.deleteMany.mockImplementation(async () => {
      callOrder.push('userDealTodo');
    });
    tx.plan.count.mockResolvedValue(0);
    tx.confirmedTrip.count.mockResolvedValue(0);
    tx.userNote.count.mockResolvedValue(0);
    tx.userDealTodo.count.mockResolvedValue(0);
    tx.user.delete.mockImplementation(async () => {
      callOrder.push('user');
    });

    const ids: UserDeleteGraphIds = {
      userId: 'user-1',
      planIds: ['plan-1'],
      planVersionIds: ['version-1'],
      confirmedTripIds: ['trip-1'],
    };

    await deleteUserOwnedGraph(tx as never, ids);

    expect(callOrder).toEqual([
      'calendarNote',
      'confirmedTrip',
      'planCurrentVersionNull',
      'planVersion',
      'plan',
      'userNote',
      'userDealTodo',
      'user',
    ]);
    expect(tx.confirmedTrip.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: 'user-1' },
          { planId: { in: ['plan-1'] } },
          { planVersionId: { in: ['version-1'] } },
        ],
      },
    });
    expect(tx.planVersion.deleteMany).toHaveBeenCalledWith({
      where: { planId: { in: ['plan-1'] } },
    });
    expect(tx.plan.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('throws before deleting the user when related rows remain', async () => {
    const tx = makeTx();
    tx.confirmedTrip.findMany.mockResolvedValue([]);
    tx.confirmedTrip.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    tx.plan.count.mockResolvedValue(0);
    tx.confirmedTrip.count.mockResolvedValue(0);
    tx.userNote.count.mockResolvedValue(0);
    tx.userDealTodo.count.mockResolvedValue(0);

    await expect(assertUserDeletable(tx as never, 'user-1')).resolves.toBeUndefined();

    tx.plan.count.mockResolvedValue(2);
    await expect(assertUserDeletable(tx as never, 'user-1')).rejects.toBeInstanceOf(UserDeleteIncompleteError);
  });
});
