import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildRentalItemAvailability, ConfirmedTripService } from './confirmed-trip.service';

function trip(input: {
  id: string;
  planId?: string | null;
  start: string;
  end: string;
  leaderName?: string;
  rentalDrone?: boolean;
  rentalStarlink?: boolean;
  rentalPowerbank?: boolean;
}) {
  return {
    id: input.id,
    planId: input.planId ?? null,
    travelStart: null,
    travelEnd: null,
    rentalDrone: input.rentalDrone ?? false,
    rentalStarlink: input.rentalStarlink ?? false,
    rentalPowerbank: input.rentalPowerbank ?? false,
    user: { name: input.leaderName ?? input.id },
    planVersion: {
      meta: {
        leaderName: input.leaderName ?? input.id,
        travelStartDate: new Date(`${input.start}T00:00:00.000Z`),
        travelEndDate: new Date(`${input.end}T00:00:00.000Z`),
      },
    },
  };
}

function requested(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

describe('buildRentalItemAvailability', () => {
  it('counts inclusive overlapping confirmed trips by rental item', () => {
    const availability = buildRentalItemAvailability(
      [
        trip({ id: 's1', start: '2026-05-01', end: '2026-05-07', rentalStarlink: true }),
        trip({ id: 's2', start: '2026-05-03', end: '2026-05-07', rentalStarlink: true }),
        trip({ id: 's3', start: '2026-05-03', end: '2026-05-07', rentalStarlink: true }),
        trip({ id: 's4', start: '2026-05-03', end: '2026-05-07', rentalStarlink: true }),
        trip({ id: 's5', start: '2026-05-03', end: '2026-05-07', rentalStarlink: true }),
      ],
      requested('2026-05-01'),
      requested('2026-05-05'),
    );

    expect(availability.find((row) => row.item === 'STARLINK')).toMatchObject({
      total: 5,
      used: 5,
      available: 0,
    });
  });

  it('excludes non-overlapping trips and counts each selected item separately', () => {
    const availability = buildRentalItemAvailability(
      [
        trip({
          id: 'multi',
          start: '2026-05-05',
          end: '2026-05-07',
          rentalDrone: true,
          rentalPowerbank: true,
        }),
        trip({ id: 'past', start: '2026-04-01', end: '2026-04-05', rentalPowerbank: true }),
      ],
      requested('2026-05-01'),
      requested('2026-05-05'),
    );

    expect(availability.find((row) => row.item === 'DRONE')).toMatchObject({ used: 1, available: 9 });
    expect(availability.find((row) => row.item === 'POWERBANK')).toMatchObject({ used: 1, available: 0 });
  });

  it('uses the provided trip list as the exclusion boundary', () => {
    const trips = [
      trip({ id: 'self', start: '2026-05-01', end: '2026-05-03', rentalDrone: true }),
      trip({ id: 'other', start: '2026-05-02', end: '2026-05-04', rentalDrone: true }),
    ].filter((row) => row.id !== 'self');

    const availability = buildRentalItemAvailability(trips, requested('2026-05-01'), requested('2026-05-05'));

    expect(availability.find((row) => row.item === 'DRONE')).toMatchObject({ used: 1, available: 9 });
  });

  it('excludes excludeConfirmedTripId from usage while keeping it visible as excluded conflict', async () => {
    const findMany = vi.fn().mockResolvedValue([
      trip({ id: 'self', start: '2026-05-01', end: '2026-05-03', rentalDrone: true }),
      trip({ id: 'other', start: '2026-05-02', end: '2026-05-04', rentalDrone: true }),
    ]);
    const service = new ConfirmedTripService({
      confirmedTrip: { findMany },
    } as unknown as PrismaClient);

    const availability = await service.getRentalItemAvailability({
      travelStartDate: '2026-05-01',
      travelEndDate: '2026-05-05',
      excludeConfirmedTripId: 'self',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
        }),
      }),
    );
    const drone = availability.find((row) => row.item === 'DRONE');
    expect(drone).toMatchObject({ used: 1, available: 9 });
    expect(drone?.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ confirmedTripId: 'self', excluded: true }),
        expect.objectContaining({ confirmedTripId: 'other', excluded: false }),
      ]),
    );
  });

  it('excludes matching planId from usage while keeping it visible as excluded conflict', () => {
    const availability = buildRentalItemAvailability(
      [
        trip({ id: 'self-plan', planId: 'plan-1', start: '2026-05-01', end: '2026-05-03', rentalStarlink: true }),
        trip({ id: 'other-plan', planId: 'plan-2', start: '2026-05-02', end: '2026-05-04', rentalStarlink: true }),
      ],
      requested('2026-05-01'),
      requested('2026-05-05'),
      { excludePlanId: 'plan-1' },
    );

    const starlink = availability.find((row) => row.item === 'STARLINK');
    expect(starlink).toMatchObject({ used: 1, available: 4 });
    expect(starlink?.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ confirmedTripId: 'self-plan', excluded: true }),
        expect.objectContaining({ confirmedTripId: 'other-plan', excluded: false }),
      ]),
    );
  });

  it('looks up only the active confirmed trip for the requested plan version', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'confirmed-1',
      planVersionId: 'version-1',
      status: 'ACTIVE',
    });
    const service = new ConfirmedTripService({
      confirmedTrip: { findFirst },
    } as unknown as PrismaClient);

    await expect(service.findActiveByPlanVersionId('version-1')).resolves.toMatchObject({
      id: 'confirmed-1',
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          planVersionId: 'version-1',
          status: 'ACTIVE',
        },
      }),
    );
  });

  it('syncs rental flags from the newly linked plan version events', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'confirmed-1',
        status: 'ACTIVE',
        planId: 'plan-1',
        userId: 'user-1',
      })
      .mockResolvedValueOnce({
        id: 'version-6',
        planId: 'plan-1',
        plan: { userId: 'user-1' },
      });
    const planVersionEventFindMany = vi.fn().mockResolvedValue([
      { event: { tourListRentalItem: 'DRONE' } },
      { event: { tourListRentalItem: 'STARLINK' } },
    ]);
    const confirmedTripUpdate = vi.fn().mockResolvedValue({});
    const service = new ConfirmedTripService({
      confirmedTrip: {
        findUnique,
        update: confirmedTripUpdate,
      },
      planVersion: { findUnique },
      planVersionEvent: { findMany: planVersionEventFindMany },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          confirmedTrip: {
            update: confirmedTripUpdate,
            findUnique: vi.fn().mockResolvedValue({
              id: 'confirmed-1',
              planVersionId: 'version-6',
              rentalDrone: true,
              rentalStarlink: true,
              rentalPowerbank: false,
            }),
          },
        }),
    } as unknown as PrismaClient);

    await service.update('confirmed-1', { planVersionId: 'version-6' });

    expect(planVersionEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { planVersionId: 'version-6' } }),
    );
    expect(confirmedTripUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'confirmed-1' },
        data: expect.objectContaining({
          planVersionId: 'version-6',
          rentalDrone: true,
          rentalStarlink: true,
          rentalPowerbank: false,
        }),
      }),
    );
  });
});
