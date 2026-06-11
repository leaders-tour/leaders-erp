import type {
  CalendarNoteKind,
  ConfirmedTripStatus,
  LodgingAssignmentType,
  LodgingBookingStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  calendarNoteCreateSchema,
  calendarNoteUpdateSchema,
  confirmTripSchema,
  createConfirmedTripDirectSchema,
  confirmedTripLodgingUpsertSchema,
  confirmedTripKoreaTeamStageOptionCreateSchema,
  confirmedTripPostTripTaskOptionCreateSchema,
  confirmedTripNoteCreateSchema,
  confirmedTripNoteUpdateSchema,
  confirmedTripUpdateSchema,
} from '@tour/validation';
import type { CurrentEmployee } from '../../context';
import type { ConfirmedTripDriverAssignmentInput, ConfirmedTripGuideAssignmentInput } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import {
  ConfirmedTripRepository,
  calendarNoteConfirmedTripInclude,
  confirmedTripInclude,
  confirmedTripLodgingInclude,
} from './confirmed-trip.repository';
import type {
  CalendarNoteCreateDto,
  CalendarNoteUpdateDto,
  ConfirmTripDto,
  CreateConfirmedTripDirectDto,
  ConfirmedTripLodgingUpsertDto,
  ConfirmedTripKoreaTeamStageOptionCreateDto,
  ConfirmedTripPostTripTaskOptionCreateDto,
  ConfirmedTripNoteCreateDto,
  ConfirmedTripNoteUpdateDto,
  ConfirmedTripUpdateDto,
  RentalItemAvailabilityDto,
} from './confirmed-trip.types';

const calendarNoteWithConfirmedTripInclude = {
  confirmedTrip: {
    include: calendarNoteConfirmedTripInclude,
  },
} satisfies Prisma.CalendarNoteInclude;

const RENTAL_ITEM_STOCK = {
  DRONE: { label: '드론', total: 10 },
  STARLINK: { label: '스타링크', total: 5 },
  POWERBANK: { label: '파워뱅크', total: 2 },
} as const;

type RentalAvailabilityItem = keyof typeof RENTAL_ITEM_STOCK;

interface RentalItemFlags {
  rentalDrone: boolean;
  rentalStarlink: boolean;
  rentalPowerbank: boolean;
}

function toDateOnlyUtc(value: Date | string): Date | null {
  const raw = value instanceof Date ? value.toISOString() : value;
  const datePart = raw.split('T')[0] ?? raw;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function rentalTripUsesItem(
  trip: {
    rentalDrone: boolean;
    rentalStarlink: boolean;
    rentalPowerbank: boolean;
  },
  item: RentalAvailabilityItem,
): boolean {
  if (item === 'DRONE') return trip.rentalDrone;
  if (item === 'STARLINK') return trip.rentalStarlink;
  return trip.rentalPowerbank;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** inclusive [start, end] 구간을 요청 기간으로 잘라낸다. 비어 있으면 null. */
function clipInclusiveDateRange(
  start: Date,
  end: Date,
  requestedStart: Date,
  requestedEnd: Date,
): { start: Date; end: Date } | null {
  const clippedStart = start > requestedStart ? start : requestedStart;
  const clippedEnd = end < requestedEnd ? end : requestedEnd;
  if (clippedStart > clippedEnd) return null;
  return { start: clippedStart, end: clippedEnd };
}

/**
 * inclusive 날짜 구간들의 최대 동시 점유 수량.
 * 종료일과 시작일이 같은 경우(같은 날 겹침)는 서로 다른 장비로 계산된다.
 */
function computeMaxConcurrentInclusiveRanges(intervals: Array<{ start: Date; end: Date }>): number {
  if (intervals.length === 0) return 0;

  const events: Array<{ day: number; delta: number }> = [];
  for (const { start, end } of intervals) {
    events.push({ day: start.getTime(), delta: 1 });
    events.push({ day: addUtcDays(end, 1).getTime(), delta: -1 });
  }

  events.sort((a, b) => a.day - b.day);

  let current = 0;
  let max = 0;
  for (const event of events) {
    current += event.delta;
    if (current > max) max = current;
  }
  return max;
}

async function getRentalItemFlagsForPlanVersion(
  prisma: PrismaClient,
  planVersionId: string,
): Promise<RentalItemFlags> {
  const versionEvents = await prisma.planVersionEvent.findMany({
    where: { planVersionId },
    include: { event: { select: { tourListRentalItem: true } } },
  });

  const flags: RentalItemFlags = {
    rentalDrone: false,
    rentalStarlink: false,
    rentalPowerbank: false,
  };
  for (const row of versionEvents) {
    const item = row.event.tourListRentalItem;
    if (item === 'DRONE') flags.rentalDrone = true;
    if (item === 'STARLINK') flags.rentalStarlink = true;
    if (item === 'POWERBANK') flags.rentalPowerbank = true;
  }
  return flags;
}

export function buildRentalItemAvailability(
  trips: Array<{
    id: string;
    planId?: string | null;
    travelStart: Date | null;
    travelEnd: Date | null;
    rentalDrone: boolean;
    rentalStarlink: boolean;
    rentalPowerbank: boolean;
    user: { name: string };
    planVersion: {
      meta: {
        leaderName: string;
        travelStartDate: Date;
        travelEndDate: Date;
      } | null;
    } | null;
  }>,
  requestedStart: Date,
  requestedEnd: Date,
  options?: {
    excludeConfirmedTripId?: string | null;
    excludePlanId?: string | null;
  },
) {
  return (Object.keys(RENTAL_ITEM_STOCK) as RentalAvailabilityItem[]).map((item) => {
    const stock = RENTAL_ITEM_STOCK[item];
    const conflicts = trips.flatMap((trip) => {
      if (!rentalTripUsesItem(trip, item)) return [];

      const start = toDateOnlyUtc(trip.planVersion?.meta?.travelStartDate ?? trip.travelStart ?? '');
      const end = toDateOnlyUtc(trip.planVersion?.meta?.travelEndDate ?? trip.travelEnd ?? '');
      if (!start || !end) return [];
      if (start > requestedEnd || end < requestedStart) return [];

      const excluded =
        Boolean(options?.excludeConfirmedTripId && trip.id === options.excludeConfirmedTripId) ||
        Boolean(options?.excludePlanId && trip.planId === options.excludePlanId);

      return [
        {
          confirmedTripId: trip.id,
          excluded,
          leaderName: trip.planVersion?.meta?.leaderName?.trim() || trip.user.name,
          travelStartDate: start,
          travelEndDate: end,
        },
      ];
    });
    const activeIntervals = conflicts
      .filter((conflict) => !conflict.excluded)
      .map((conflict) =>
        clipInclusiveDateRange(
          conflict.travelStartDate,
          conflict.travelEndDate,
          requestedStart,
          requestedEnd,
        ),
      )
      .filter((interval): interval is { start: Date; end: Date } => interval !== null);
    const used = computeMaxConcurrentInclusiveRanges(activeIntervals);

    return {
      item,
      label: stock.label,
      total: stock.total,
      used,
      available: stock.total - used,
      conflicts,
    };
  });
}

export class ConfirmedTripService {
  constructor(private readonly prisma: PrismaClient) {}

  list(status?: ConfirmedTripStatus) {
    return new ConfirmedTripRepository(this.prisma).findMany(status);
  }

  async get(id: string) {
    const trip = await new ConfirmedTripRepository(this.prisma).findById(id);
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }
    return trip;
  }

  findActiveByPlanVersionId(planVersionId: string) {
    return new ConfirmedTripRepository(this.prisma).findActiveByPlanVersionId(planVersionId);
  }

  async getRentalItemAvailability(input: RentalItemAvailabilityDto) {
    const requestedStart = toDateOnlyUtc(input.travelStartDate);
    const requestedEnd = toDateOnlyUtc(input.travelEndDate);
    if (!requestedStart || !requestedEnd) {
      throw new DomainError('VALIDATION_FAILED', 'travelStartDate/travelEndDate must be valid dates');
    }
    if (requestedStart > requestedEnd) {
      throw new DomainError('VALIDATION_FAILED', 'travelStartDate must be before or equal to travelEndDate');
    }

    const trips = await this.prisma.confirmedTrip.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ rentalDrone: true }, { rentalStarlink: true }, { rentalPowerbank: true }],
      },
      select: {
        id: true,
        planId: true,
        travelStart: true,
        travelEnd: true,
        rentalDrone: true,
        rentalStarlink: true,
        rentalPowerbank: true,
        user: { select: { name: true } },
        planVersion: {
          select: {
            meta: {
              select: {
                leaderName: true,
                travelStartDate: true,
                travelEndDate: true,
              },
            },
          },
        },
      },
    });

    return buildRentalItemAvailability(trips, requestedStart, requestedEnd, {
      excludeConfirmedTripId: input.excludeConfirmedTripId,
      excludePlanId: input.excludePlanId,
    });
  }

  listKoreaTeamStageOptions(activeOnly = true) {
    return this.prisma.confirmedTripKoreaTeamStageOption.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listPostTripTaskOptions(activeOnly = true) {
    return this.prisma.confirmedTripPostTripTaskOption.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createKoreaTeamStageOption(input: ConfirmedTripKoreaTeamStageOptionCreateDto) {
    const parsed = confirmedTripKoreaTeamStageOptionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid korea team stage option input', parsed.error);
    }

    const label = parsed.data.label;
    const existing = await this.prisma.confirmedTripKoreaTeamStageOption.findUnique({
      where: { label },
    });
    if (existing) return existing;

    const last = await this.prisma.confirmedTripKoreaTeamStageOption.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    try {
      return await this.prisma.confirmedTripKoreaTeamStageOption.create({
        data: {
          label,
          colorTone: 'slate',
          sortOrder: (last?.sortOrder ?? -1) + 1,
          isActive: true,
        },
      });
    } catch {
      const raced = await this.prisma.confirmedTripKoreaTeamStageOption.findUnique({
        where: { label },
      });
      if (raced) return raced;
      throw new DomainError('VALIDATION_FAILED', 'Failed to create korea team stage option');
    }
  }

  async createPostTripTaskOption(input: ConfirmedTripPostTripTaskOptionCreateDto) {
    const parsed = confirmedTripPostTripTaskOptionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid post-trip task option input', parsed.error);
    }

    const label = parsed.data.label;
    const existing = await this.prisma.confirmedTripPostTripTaskOption.findUnique({
      where: { label },
    });
    if (existing) return existing;

    const last = await this.prisma.confirmedTripPostTripTaskOption.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    try {
      return await this.prisma.confirmedTripPostTripTaskOption.create({
        data: {
          label,
          colorTone: 'slate',
          sortOrder: (last?.sortOrder ?? -1) + 1,
          isActive: true,
        },
      });
    } catch {
      const raced = await this.prisma.confirmedTripPostTripTaskOption.findUnique({
        where: { label },
      });
      if (raced) return raced;
      throw new DomainError('VALIDATION_FAILED', 'Failed to create post-trip task option');
    }
  }

  async confirm(input: ConfirmTripDto) {
    const parsed = confirmTripSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirm trip input', parsed.error);
    }

    const { planId, planVersionId, confirmedByEmployeeId } = parsed.data;

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, userId: true },
    });
    if (!plan) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    const version = await this.prisma.planVersion.findUnique({
      where: { id: planVersionId },
      select: { id: true, planId: true },
    });
    if (!version) {
      throw new DomainError('NOT_FOUND', 'Plan version not found');
    }
    if (version.planId !== planId) {
      throw new DomainError('VALIDATION_FAILED', 'Plan version does not belong to the specified plan');
    }

    const repo = new ConfirmedTripRepository(this.prisma);
    const existing = await repo.findActiveByPlanId(planId);
    if (existing) {
      throw new DomainError('VALIDATION_FAILED', 'This plan already has an active confirmed trip. Cancel the existing one first.');
    }

    const rentalItemFlags = await getRentalItemFlagsForPlanVersion(this.prisma, planVersionId);

    return repo.create({
      userId: plan.userId,
      planId,
      planVersionId,
      confirmedByEmployeeId: confirmedByEmployeeId ?? null,
      ...rentalItemFlags,
    });
  }

  async createDirect(input: CreateConfirmedTripDirectDto) {
    const parsed = createConfirmedTripDirectSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid create confirmed trip input', parsed.error);
    }

    const { userId, confirmedByEmployeeId, ...rest } = parsed.data;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }

    return new ConfirmedTripRepository(this.prisma).create({
      userId,
      planId: null,
      planVersionId: null,
      confirmedByEmployeeId: confirmedByEmployeeId ?? null,
      ...rest,
    });
  }

  async update(id: string, input: ConfirmedTripUpdateDto) {
    const parsed = confirmedTripUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirmed trip update input', parsed.error);
    }

    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id },
      select: { id: true, status: true, planId: true, userId: true },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }

    const {
      status,
      planVersionId: nextPlanVersionId,
      confirmedAt: nextConfirmedAt,
      guideAssignments,
      driverAssignments,
      koreaTeamStageOptionIds,
      postTripTaskOptionIds,
      ...scalarRest
    } = parsed.data;

    if (nextConfirmedAt !== undefined && trip.status !== 'ACTIVE') {
      throw new DomainError(
        'VALIDATION_FAILED',
        'confirmedAt can only be updated on an active confirmed trip',
      );
    }

    let migrationLinkedPlanId: string | undefined;
    if (nextPlanVersionId !== undefined) {
      if (trip.status !== 'ACTIVE') {
        throw new DomainError(
          'VALIDATION_FAILED',
          'planVersionId can only be updated on an active confirmed trip',
        );
      }
      const version = await this.prisma.planVersion.findUnique({
        where: { id: nextPlanVersionId },
        select: {
          id: true,
          planId: true,
          plan: { select: { userId: true } },
        },
      });
      if (!version) {
        throw new DomainError('NOT_FOUND', 'Plan version not found');
      }

      if (trip.planId) {
        if (version.planId !== trip.planId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Plan version does not belong to the confirmed trip plan',
          );
        }
      } else {
        if (version.plan.userId !== trip.userId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Plan version does not belong to this trip user; cannot link',
          );
        }
        migrationLinkedPlanId = version.planId;
      }
    }

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(scalarRest)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (nextPlanVersionId !== undefined) {
      updateData.planVersionId = nextPlanVersionId;
      Object.assign(updateData, await getRentalItemFlagsForPlanVersion(this.prisma, nextPlanVersionId));
      if (migrationLinkedPlanId) {
        updateData.planId = migrationLinkedPlanId;
      }
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (nextConfirmedAt !== undefined) {
      updateData.confirmedAt = nextConfirmedAt;
    }

    return this.prisma.$transaction(async (tx) => {
      const hasScalarUpdates = Object.keys(updateData).length > 0;
      if (hasScalarUpdates) {
        await tx.confirmedTrip.update({
          where: { id },
          data: updateData as Prisma.ConfirmedTripUpdateInput,
        });
      }

      if (guideAssignments !== undefined) {
        await tx.confirmedTripGuideAssignment.deleteMany({ where: { confirmedTripId: id } });
        const normalizedGuides = normalizeGuideAssignmentsForPersistence(guideAssignments);
        if (normalizedGuides.length > 0) {
          const guideRows = await tx.guide.findMany({
            where: { id: { in: normalizedGuides.map((r) => r.guideId) } },
            select: { id: true },
          });
          if (guideRows.length !== normalizedGuides.length) {
            throw new DomainError('VALIDATION_FAILED', 'One or more guide IDs are invalid');
          }
          await Promise.all(
            normalizedGuides.map((row) =>
              tx.confirmedTripGuideAssignment.create({
                data: {
                  confirmedTripId: id,
                  guideId: row.guideId,
                  sortOrder: row.sortOrder,
                  nameSnapshot: row.nameSnapshot,
                },
              }),
            ),
          );
        }
      }

      if (driverAssignments !== undefined) {
        await tx.confirmedTripDriverAssignment.deleteMany({ where: { confirmedTripId: id } });
        const normalizedDrivers = normalizeDriverAssignmentsForPersistence(driverAssignments);
        if (normalizedDrivers.length > 0) {
          const driverRows = await tx.driver.findMany({
            where: { id: { in: normalizedDrivers.map((r) => r.driverId) } },
            select: { id: true },
          });
          if (driverRows.length !== normalizedDrivers.length) {
            throw new DomainError('VALIDATION_FAILED', 'One or more driver IDs are invalid');
          }
          await Promise.all(
            normalizedDrivers.map((row) =>
              tx.confirmedTripDriverAssignment.create({
                data: {
                  confirmedTripId: id,
                  driverId: row.driverId,
                  sortOrder: row.sortOrder,
                  nameSnapshot: row.nameSnapshot,
                },
              }),
            ),
          );
        }
      }

      if (koreaTeamStageOptionIds !== undefined) {
        await tx.confirmedTripKoreaTeamStageSelection.deleteMany({ where: { confirmedTripId: id } });
        if (koreaTeamStageOptionIds.length > 0) {
          const options = await tx.confirmedTripKoreaTeamStageOption.findMany({
            where: { id: { in: koreaTeamStageOptionIds } },
            select: { id: true },
          });
          if (options.length !== koreaTeamStageOptionIds.length) {
            throw new DomainError('VALIDATION_FAILED', 'One or more korea team stage option IDs are invalid');
          }
          await Promise.all(
            koreaTeamStageOptionIds.map((optionId) =>
              tx.confirmedTripKoreaTeamStageSelection.create({
                data: {
                  confirmedTripId: id,
                  optionId,
                },
              }),
            ),
          );
        }
      }

      if (postTripTaskOptionIds !== undefined) {
        await tx.confirmedTripPostTripTaskSelection.deleteMany({ where: { confirmedTripId: id } });
        if (postTripTaskOptionIds.length > 0) {
          const options = await tx.confirmedTripPostTripTaskOption.findMany({
            where: { id: { in: postTripTaskOptionIds } },
            select: { id: true },
          });
          if (options.length !== postTripTaskOptionIds.length) {
            throw new DomainError('VALIDATION_FAILED', 'One or more post-trip task option IDs are invalid');
          }
          await Promise.all(
            postTripTaskOptionIds.map((optionId) =>
              tx.confirmedTripPostTripTaskSelection.create({
                data: {
                  confirmedTripId: id,
                  optionId,
                },
              }),
            ),
          );
        }
      }

      const refreshed = await tx.confirmedTrip.findUnique({
        where: { id },
        include: confirmedTripInclude,
      });
      if (!refreshed) {
        throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
      }
      return refreshed;
    });
  }

  async cancel(id: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }
    if (trip.status === 'CANCELLED') {
      throw new DomainError('VALIDATION_FAILED', 'Trip is already cancelled');
    }

    return new ConfirmedTripRepository(this.prisma).update(id, { status: 'CANCELLED' });
  }

  async upsertLodging(input: ConfirmedTripLodgingUpsertDto) {
    const parsed = confirmedTripLodgingUpsertSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid lodging input', parsed.error);
    }

    const d = parsed.data;
    const optAssignments = d.optionAssignments;
    const checkIn = new Date(d.checkInDate);
    const checkOut = new Date(d.checkOutDate);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const roomCount =
      d.type === 'ACCOMMODATION' ? optAssignments.reduce((sum, o) => sum + o.roomCount, 0) : (d.roomCount ?? 1);

    const accommodationId = d.accommodationId ?? null;
    const pricePerNightKrw = d.pricePerNightKrw ?? null;
    const totalPriceKrw = pricePerNightKrw != null ? pricePerNightKrw * nights * roomCount : null;

    if (d.type === 'ACCOMMODATION' && accommodationId) {
      const optionIds = [...new Set(optAssignments.map((o) => o.accommodationOptionId))];
      const found = await this.prisma.accommodationOption.findMany({
        where: { id: { in: optionIds }, accommodationId },
        select: { id: true },
      });
      if (found.length !== optionIds.length) {
        throw new DomainError(
          'VALIDATION_FAILED',
          'One or more accommodation options are invalid or do not belong to the selected accommodation',
        );
      }
    }

    const lodging = await this.prisma.$transaction(async (tx) => {
      const repo = new ConfirmedTripRepository(tx);
      const saved = await repo.upsertLodging({
        id: d.id,
        confirmedTripId: d.confirmedTripId,
        dayIndex: d.dayIndex,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        type: d.type as LodgingAssignmentType,
        accommodationId,
        lodgingNameSnapshot: d.lodgingNameSnapshot,
        pricePerNightKrw: pricePerNightKrw ?? null,
        roomCount,
        totalPriceKrw,
        bookingStatus: d.bookingStatus as LodgingBookingStatus,
        bookingMemo: d.bookingMemo ?? null,
        bookingReference: d.bookingReference ?? null,
      });

      await tx.confirmedTripLodgingOption.deleteMany({
        where: { confirmedTripLodgingId: saved.id },
      });

      if (optAssignments.length > 0) {
        await Promise.all(
          optAssignments.map((o) =>
            tx.confirmedTripLodgingOption.create({
              data: {
                confirmedTripLodgingId: saved.id,
                accommodationOptionId: o.accommodationOptionId,
                roomCount: o.roomCount,
              },
            }),
          ),
        );
      }

      return tx.confirmedTripLodging.findUniqueOrThrow({
        where: { id: saved.id },
        include: confirmedTripLodgingInclude,
      });
    });

    const conflictWarnings = await this.findConflictWarnings(
      accommodationId,
      checkIn,
      checkOut,
      d.confirmedTripId,
    );

    return { ...lodging, conflictWarnings };
  }

  async deleteLodging(id: string) {
    const repo = new ConfirmedTripRepository(this.prisma);
    const existing = await repo.findLodgingById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Lodging not found');
    }
    await repo.deleteLodging(id);
    return true;
  }

  async seedLodgingsFromPlan(confirmedTripId: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id: confirmedTripId },
      include: {
        planVersion: {
          include: {
            meta: true,
          },
        },
      },
    });

    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }

    const meta = trip.planVersion?.meta;
    if (!meta) {
      throw new DomainError('VALIDATION_FAILED', 'No plan version meta found for this trip');
    }

    const rawSelections = meta.lodgingSelections as Array<{
      dayIndex: number;
      level: string;
      customLodgingId?: string | null;
      customLodgingNameSnapshot?: string | null;
      pricingModeSnapshot?: string | null;
    }>;

    if (!rawSelections || rawSelections.length === 0) {
      return [];
    }

    const travelStartDate = new Date(meta.travelStartDate);

    const repo = new ConfirmedTripRepository(this.prisma);
    await repo.deleteLodgingsByTripId(confirmedTripId);

    const lodgingLevelMap: Record<string, LodgingAssignmentType> = {
      LV1: 'LV1',
      LV2: 'LV2',
      LV3: 'LV3',
      LV4: 'LV4',
      NIGHT_TRAIN: 'NIGHT_TRAIN',
      CUSTOM: 'CUSTOM_TEXT',
    };

    const items = rawSelections.map((sel) => {
      const dayOffset = sel.dayIndex - 1;
      const checkInDate = new Date(travelStartDate);
      checkInDate.setDate(checkInDate.getDate() + dayOffset);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 1);

      const type: LodgingAssignmentType = lodgingLevelMap[sel.level] ?? 'CUSTOM_TEXT';
      const lodgingNameSnapshot =
        sel.customLodgingNameSnapshot ?? sel.level;

      return {
        confirmedTripId,
        dayIndex: sel.dayIndex,
        checkInDate,
        checkOutDate,
        nights: 1,
        type,
        accommodationId: null as string | null,
        lodgingNameSnapshot,
        pricePerNightKrw: null as number | null,
        roomCount: 1,
        totalPriceKrw: null as number | null,
        bookingStatus: 'PENDING' as LodgingBookingStatus,
      };
    });

    await repo.createManyLodgings(items);

    const refreshed = await repo.findById(confirmedTripId);
    const lodgings = refreshed?.lodgings ?? [];

    const withWarnings = await Promise.all(
      lodgings.map(async (l) => {
        const conflicts = await this.findConflictWarnings(
          l.accommodationId,
          l.checkInDate,
          l.checkOutDate,
          confirmedTripId,
        );
        return { ...l, conflictWarnings: conflicts };
      }),
    );

    return withWarnings;
  }

  async getLodgingsWithConflicts(confirmedTripId: string) {
    const repo = new ConfirmedTripRepository(this.prisma);
    const trip = await repo.findById(confirmedTripId);
    if (!trip) throw new DomainError('NOT_FOUND', 'Confirmed trip not found');

    const lodgings = trip.lodgings ?? [];
    return Promise.all(
      lodgings.map(async (l) => {
        const conflicts = await this.findConflictWarnings(
          l.accommodationId,
          l.checkInDate,
          l.checkOutDate,
          confirmedTripId,
        );
        return { ...l, conflictWarnings: conflicts };
      }),
    );
  }

  // ── CalendarNote ──────────────────────────────────────────────────────────

  listCalendarNotes(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0); // 마지막 날
    return this.prisma.calendarNote.findMany({
      where: {
        occursOn: { gte: from, lte: to },
      },
      include: calendarNoteWithConfirmedTripInclude,
      orderBy: { occursOn: 'asc' },
    });
  }

  listConfirmedTripCalendarNotes(confirmedTripId: string) {
    return this.prisma.calendarNote.findMany({
      where: { confirmedTripId },
      include: calendarNoteWithConfirmedTripInclude,
      orderBy: [{ occursOn: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listConfirmedTripNotes(confirmedTripId: string) {
    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id: confirmedTripId },
      select: { id: true },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }

    return this.prisma.confirmedTripNote.findMany({
      where: { confirmedTripId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async createConfirmedTripNote(input: ConfirmedTripNoteCreateDto, employee: CurrentEmployee) {
    const parsed = confirmedTripNoteCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirmed trip note input', parsed.error);
    }

    const trip = await this.prisma.confirmedTrip.findUnique({
      where: { id: parsed.data.confirmedTripId },
      select: { id: true },
    });
    if (!trip) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip not found');
    }

    return this.prisma.confirmedTripNote.create({
      data: {
        confirmedTripId: parsed.data.confirmedTripId,
        content: parsed.data.content,
        createdByEmployeeId: employee.id,
        createdByName: employee.name,
      },
    });
  }

  async updateConfirmedTripNote(id: string, input: ConfirmedTripNoteUpdateDto, employee: CurrentEmployee) {
    const parsed = confirmedTripNoteUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid confirmed trip note update input', parsed.error);
    }

    const existing = await this.prisma.confirmedTripNote.findUnique({ where: { id } });
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip note not found');
    }
    if (existing.createdByEmployeeId !== employee.id) {
      throw new DomainError('FORBIDDEN', 'Only the note author can update this note');
    }

    return this.prisma.confirmedTripNote.update({
      where: { id },
      data: { content: parsed.data.content },
    });
  }

  async deleteConfirmedTripNote(id: string, employee: CurrentEmployee) {
    const existing = await this.prisma.confirmedTripNote.findUnique({ where: { id } });
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Confirmed trip note not found');
    }
    if (existing.createdByEmployeeId !== employee.id) {
      throw new DomainError('FORBIDDEN', 'Only the note author can delete this note');
    }

    await this.prisma.confirmedTripNote.delete({ where: { id } });
    return true;
  }

  async createCalendarNote(input: CalendarNoteCreateDto) {
    const parsed = calendarNoteCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid calendar note input', parsed.error);
    }
    const { occursOn, kind, customText, timeText, headcount, confirmedTripId, memo } = parsed.data;
    return this.prisma.calendarNote.create({
      data: {
        occursOn: new Date(occursOn),
        kind: kind as CalendarNoteKind,
        customText: customText ?? null,
        timeText: timeText ?? null,
        headcount: headcount ?? null,
        confirmedTripId: confirmedTripId ?? null,
        memo: memo ?? null,
      },
      include: calendarNoteWithConfirmedTripInclude,
    });
  }

  async updateCalendarNote(id: string, input: CalendarNoteUpdateDto) {
    const parsed = calendarNoteUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid calendar note update input', parsed.error);
    }

    const existing = await this.prisma.calendarNote.findUnique({ where: { id } });
    if (!existing) throw new DomainError('NOT_FOUND', 'Calendar note not found');

    const { occursOn, kind, customText, timeText, headcount, confirmedTripId, memo } = parsed.data;
    const data: Record<string, unknown> = {};
    if (occursOn !== undefined) data.occursOn = new Date(occursOn);
    if (kind !== undefined) data.kind = kind as CalendarNoteKind;
    if (customText !== undefined) data.customText = customText ?? null;
    if (timeText !== undefined) data.timeText = timeText;
    if (headcount !== undefined) data.headcount = headcount;
    if (confirmedTripId !== undefined) data.confirmedTripId = confirmedTripId ?? null;
    if (memo !== undefined) data.memo = memo ?? null;

    return this.prisma.calendarNote.update({
      where: { id },
      data,
      include: calendarNoteWithConfirmedTripInclude,
    });
  }

  async deleteCalendarNote(id: string) {
    const existing = await this.prisma.calendarNote.findUnique({ where: { id } });
    if (!existing) throw new DomainError('NOT_FOUND', 'Calendar note not found');
    await this.prisma.calendarNote.delete({ where: { id } });
    return true;
  }

  private async findConflictWarnings(
    accommodationId: string | null | undefined,
    checkInDate: Date,
    checkOutDate: Date,
    excludeTripId: string,
  ) {
    if (!accommodationId) return [];

    const repo = new ConfirmedTripRepository(this.prisma);
    const conflicts = await repo.findConflictingLodgings(
      accommodationId,
      checkInDate,
      checkOutDate,
      excludeTripId,
    );

    return conflicts.map((c) => {
      const leaderName =
        (c.confirmedTrip.planVersion?.meta as { leaderName?: string } | null)?.leaderName ?? c.confirmedTripId;
      const overlapStart = checkInDate > c.checkInDate ? checkInDate : c.checkInDate;
      const overlapEnd = checkOutDate < c.checkOutDate ? checkOutDate : c.checkOutDate;
      return {
        conflictingTripId: c.confirmedTripId,
        conflictingTripLeaderName: leaderName,
        overlapStartDate: overlapStart,
        overlapEndDate: overlapEnd,
      };
    });
  }
}

function normalizeGuideAssignmentsForPersistence(input: ConfirmedTripGuideAssignmentInput[]): Array<{
  guideId: string;
  sortOrder: number;
  nameSnapshot: string | null;
}> {
  const decorated = input.map((row, originalIndex) => ({
    row,
    sortKey: row.sortOrder ?? originalIndex,
  }));
  decorated.sort((a, b) => a.sortKey - b.sortKey);
  return decorated.map(({ row }, position) => ({
    guideId: row.guideId,
    sortOrder: row.sortOrder ?? position,
    nameSnapshot: row.nameSnapshot ?? null,
  }));
}

function normalizeDriverAssignmentsForPersistence(input: ConfirmedTripDriverAssignmentInput[]): Array<{
  driverId: string;
  sortOrder: number;
  nameSnapshot: string | null;
}> {
  const decorated = input.map((row, originalIndex) => ({
    row,
    sortKey: row.sortOrder ?? originalIndex,
  }));
  decorated.sort((a, b) => a.sortKey - b.sortKey);
  return decorated.map(({ row }, position) => ({
    driverId: row.driverId,
    sortOrder: row.sortOrder ?? position,
    nameSnapshot: row.nameSnapshot ?? null,
  }));
}
