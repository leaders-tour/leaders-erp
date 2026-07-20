import { describe, expect, it, vi } from 'vitest';
import {
  reconcileUserNameDisambiguatorsForName,
  type PrismaLikeForUserNameDisambiguation,
} from './user-name-disambiguation.service';

describe('reconcileUserNameDisambiguatorsForName', () => {
  it('clears disambiguator when only one user remains in the group', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'u1', name: '오동환', createdAt: new Date('2026-01-01') },
        ]),
        update,
      },
    };

    await reconcileUserNameDisambiguatorsForName(
      prisma as unknown as PrismaLikeForUserNameDisambiguation,
      '오동환',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { nameDisambiguator: null },
    });
  });

  it('assigns A,B,C when three users share the same name', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'u1', name: '오동환', createdAt: new Date('2026-01-01') },
          { id: 'u2', name: '오동환', createdAt: new Date('2026-01-02') },
          { id: 'u3', name: '  오동환  ', createdAt: new Date('2026-01-03') },
        ]),
        update,
      },
    };

    await reconcileUserNameDisambiguatorsForName(
      prisma as unknown as PrismaLikeForUserNameDisambiguation,
      '오동환',
    );

    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'u1' },
      data: { nameDisambiguator: 'A' },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'u2' },
      data: { nameDisambiguator: 'B' },
    });
    expect(update).toHaveBeenNthCalledWith(3, {
      where: { id: 'u3' },
      data: { nameDisambiguator: 'C' },
    });
  });
});
