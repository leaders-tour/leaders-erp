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
  confirmedTripUpdateSchema,
} from '@tour/validation';
import type { ConfirmedTripDriverAssignmentInput, ConfirmedTripGuideAssignmentInput } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { ConfirmedTripRepository, confirmedTripInclude } from './confirmed-trip.repository';
import type {
  CalendarNoteCreateDto,
  CalendarNoteUpdateDto,
  ConfirmTripDto,
  CreateConfirmedTripDirectDto,
  ConfirmedTripLodgingUpsertDto,
  ConfirmedTripUpdateDto,
} from './confirmed-trip.types';

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

    const versionEvents = await this.prisma.planVersionEvent.findMany({
      where: { planVersionId },
      include: { event: { select: { tourListRentalItem: true } } },
    });

    let rentalDrone = false;
    let rentalStarlink = false;
    let rentalPowerbank = false;
    for (const row of versionEvents) {
      const item = row.event.tourListRentalItem;
      if (item === 'DRONE') rentalDrone = true;
      if (item === 'STARLINK') rentalStarlink = true;
      if (item === 'POWERBANK') rentalPowerbank = true;
    }

    return repo.create({
      userId: plan.userId,
      planId,
      planVersionId,
      confirmedByEmployeeId: confirmedByEmployeeId ?? null,
      rentalDrone,
      rentalStarlink,
      rentalPowerbank,
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

    const { checkInDate, checkOutDate, pricePerNightKrw, roomCount } = parsed.data;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPriceKrw =
      pricePerNightKrw != null ? pricePerNightKrw * nights * roomCount : null;

    const repo = new ConfirmedTripRepository(this.prisma);
    const lodging = await repo.upsertLodging({
      id: parsed.data.id,
      confirmedTripId: parsed.data.confirmedTripId,
      dayIndex: parsed.data.dayIndex,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      type: parsed.data.type as LodgingAssignmentType,
      accommodationId: parsed.data.accommodationId ?? null,
      accommodationOptionId: parsed.data.accommodationOptionId ?? null,
      lodgingNameSnapshot: parsed.data.lodgingNameSnapshot,
      pricePerNightKrw: pricePerNightKrw ?? null,
      roomCount,
      totalPriceKrw,
      bookingStatus: parsed.data.bookingStatus as LodgingBookingStatus,
      bookingMemo: parsed.data.bookingMemo ?? null,
      bookingReference: parsed.data.bookingReference ?? null,
    });

    const conflictWarnings = await this.findConflictWarnings(
      parsed.data.accommodationId ?? null,
      checkIn,
      checkOut,
      parsed.data.confirmedTripId,
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
        accommodationOptionId: null as string | null,
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
      include: {
        confirmedTrip: true,
      },
      orderBy: { occursOn: 'asc' },
    });
  }

  async createCalendarNote(input: CalendarNoteCreateDto) {
    const parsed = calendarNoteCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid calendar note input', parsed.error);
    }
    const { occursOn, kind, customText, confirmedTripId, memo } = parsed.data;
    return this.prisma.calendarNote.create({
      data: {
        occursOn: new Date(occursOn),
        kind: kind as CalendarNoteKind,
        customText: customText ?? null,
        confirmedTripId: confirmedTripId ?? null,
        memo: memo ?? null,
      },
      include: { confirmedTrip: true },
    });
  }

  async updateCalendarNote(id: string, input: CalendarNoteUpdateDto) {
    const parsed = calendarNoteUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid calendar note update input', parsed.error);
    }

    const existing = await this.prisma.calendarNote.findUnique({ where: { id } });
    if (!existing) throw new DomainError('NOT_FOUND', 'Calendar note not found');

    const { occursOn, kind, customText, confirmedTripId, memo } = parsed.data;
    const data: Record<string, unknown> = {};
    if (occursOn !== undefined) data.occursOn = new Date(occursOn);
    if (kind !== undefined) data.kind = kind as CalendarNoteKind;
    if (customText !== undefined) data.customText = customText ?? null;
    if (confirmedTripId !== undefined) data.confirmedTripId = confirmedTripId ?? null;
    if (memo !== undefined) data.memo = memo ?? null;

    return this.prisma.calendarNote.update({
      where: { id },
      data,
      include: { confirmedTrip: true },
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
