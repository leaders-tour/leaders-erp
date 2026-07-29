import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../../lib/errors';
import { ConfirmedTripService } from './confirmed-trip.service';

function createPrismaMock(overrides: Partial<PrismaClient> = {}): PrismaClient {
  return {
    confirmedTripKoreaTeamStageOption: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    confirmedTripKoreaTeamStageSelection: {
      count: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops);
      }
      return typeof ops === 'function' ? ops({}) : ops;
    }),
    ...overrides,
  } as unknown as PrismaClient;
}

describe('ConfirmedTripService korea team stage options', () => {
  it('updates label and colorTone', async () => {
    const prisma = createPrismaMock();
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.findUnique)
      .mockResolvedValueOnce({
        id: 'opt-1',
        label: '확정서',
        colorTone: 'slate',
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.update).mockResolvedValue({
      id: 'opt-1',
      label: '확정서 v2',
      colorTone: 'blue',
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new ConfirmedTripService(prisma);
    const result = await service.updateKoreaTeamStageOption('opt-1', {
      label: '확정서 v2',
      colorTone: 'blue',
    });

    expect(result.label).toBe('확정서 v2');
    expect(result.colorTone).toBe('blue');
  });

  it('rejects duplicate label on update', async () => {
    const prisma = createPrismaMock();
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.findUnique)
      .mockResolvedValueOnce({
        id: 'opt-1',
        label: '확정서',
        colorTone: 'slate',
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'opt-2',
        label: '오픈채팅',
        colorTone: 'slate',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const service = new ConfirmedTripService(prisma);
    await expect(service.updateKoreaTeamStageOption('opt-1', { label: '오픈채팅' })).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it('blocks delete when option is used by a trip', async () => {
    const prisma = createPrismaMock();
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.findUnique).mockResolvedValue({
      id: 'opt-1',
      label: '확정서',
      colorTone: 'slate',
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.confirmedTripKoreaTeamStageSelection.count).mockResolvedValue(2);

    const service = new ConfirmedTripService(prisma);
    await expect(service.deleteKoreaTeamStageOption('opt-1')).rejects.toBeInstanceOf(DomainError);
    expect(prisma.confirmedTripKoreaTeamStageOption.delete).not.toHaveBeenCalled();
  });

  it('deletes unused option', async () => {
    const prisma = createPrismaMock();
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.findUnique).mockResolvedValue({
      id: 'opt-1',
      label: '확정서',
      colorTone: 'slate',
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.confirmedTripKoreaTeamStageSelection.count).mockResolvedValue(0);

    const service = new ConfirmedTripService(prisma);
    const result = await service.deleteKoreaTeamStageOption('opt-1');

    expect(result).toBe(true);
    expect(prisma.confirmedTripKoreaTeamStageOption.delete).toHaveBeenCalledWith({ where: { id: 'opt-1' } });
  });

  it('reorders all active options', async () => {
    const prisma = createPrismaMock();
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.findMany).mockResolvedValue([
      {
        id: 'a',
        label: 'A',
        colorTone: 'slate',
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'b',
        label: 'B',
        colorTone: 'slate',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(prisma.confirmedTripKoreaTeamStageOption.update).mockResolvedValue({
      id: 'a',
      label: 'A',
      colorTone: 'slate',
      sortOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new ConfirmedTripService(prisma);
    await service.reorderKoreaTeamStageOptions([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.confirmedTripKoreaTeamStageOption.update).toHaveBeenCalledTimes(2);
  });
});
