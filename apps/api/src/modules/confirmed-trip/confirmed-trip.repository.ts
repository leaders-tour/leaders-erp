import type { ConfirmedTripStatus, LodgingAssignmentType, LodgingBookingStatus, Prisma, PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const confirmedTripInclude = {
  user: { include: { ownerEmployee: true } },
  plan: { include: { regionSet: true } },
  planVersion: {
    include: {
      meta: { include: { transportGroups: { orderBy: { orderIndex: 'asc' as const } } } },
      pricing: true,
      planStops: { orderBy: { id: 'asc' as const } },
      regionSet: true,
    },
  },
  confirmedByEmployee: true,
  guide: true,
  driver: true,
  lodgings: {
    include: { accommodation: true },
    orderBy: { dayIndex: 'asc' as const },
  },
} satisfies Prisma.ConfirmedTripInclude;

export class ConfirmedTripRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(status?: ConfirmedTripStatus) {
    return this.prisma.confirmedTrip.findMany({
      where: status ? { status } : undefined,
      include: confirmedTripInclude,
      orderBy: [{ travelStart: 'asc' }, { confirmedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.confirmedTrip.findUnique({
      where: { id },
      include: confirmedTripInclude,
    });
  }

  findActiveByPlanId(planId: string) {
    return this.prisma.confirmedTrip.findFirst({
      where: { planId, status: 'ACTIVE' },
      include: confirmedTripInclude,
    });
  }

  create(data: {
    userId: string;
    planId: string;
    planVersionId: string;
    confirmedByEmployeeId?: string | null;
  }) {
    return this.prisma.confirmedTrip.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        planVersionId: data.planVersionId,
        confirmedByEmployeeId: data.confirmedByEmployeeId ?? null,
      },
      include: confirmedTripInclude,
    });
  }

  findLodgingById(id: string) {
    return this.prisma.confirmedTripLodging.findUnique({
      where: { id },
      include: { accommodation: true, confirmedTrip: true },
    });
  }

  upsertLodging(data: {
    id?: string;
    confirmedTripId: string;
    dayIndex: number;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    type: LodgingAssignmentType;
    accommodationId?: string | null;
    accommodationOptionId?: string | null;
    lodgingNameSnapshot: string;
    pricePerNightKrw?: number | null;
    roomCount: number;
    totalPriceKrw?: number | null;
    bookingStatus: LodgingBookingStatus;
    bookingMemo?: string | null;
    bookingReference?: string | null;
  }) {
    const { id, ...rest } = data;
    if (id) {
      return this.prisma.confirmedTripLodging.update({
        where: { id },
        data: rest,
        include: { accommodation: true },
      });
    }
    return this.prisma.confirmedTripLodging.create({
      data: rest,
      include: { accommodation: true },
    });
  }

  deleteLodging(id: string) {
    return this.prisma.confirmedTripLodging.delete({ where: { id } });
  }

  findConflictingLodgings(accommodationId: string, checkInDate: Date, checkOutDate: Date, excludeTripId: string) {
    return this.prisma.confirmedTripLodging.findMany({
      where: {
        accommodationId,
        confirmedTripId: { not: excludeTripId },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
      include: {
        confirmedTrip: {
          include: { planVersion: { include: { meta: true } } },
        },
      },
    });
  }

  createManyLodgings(items: Array<{
    confirmedTripId: string;
    dayIndex: number;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    type: LodgingAssignmentType;
    accommodationId?: string | null;
    accommodationOptionId?: string | null;
    lodgingNameSnapshot: string;
    pricePerNightKrw?: number | null;
    roomCount: number;
    totalPriceKrw?: number | null;
    bookingStatus: LodgingBookingStatus;
  }>) {
    return this.prisma.confirmedTripLodging.createMany({ data: items });
  }

  deleteLodgingsByTripId(confirmedTripId: string) {
    return this.prisma.confirmedTripLodging.deleteMany({ where: { confirmedTripId } });
  }

  update(
    id: string,
    data: Partial<{
      guideName: string | null;
      driverName: string | null;
      assignedVehicle: string | null;
      accommodationNote: string | null;
      operationNote: string | null;
      status: ConfirmedTripStatus;
      travelStart: Date | null;
      travelEnd: Date | null;
      pickupDate: Date | null;
      dropDate: Date | null;
      destination: string | null;
      paxCount: number | null;
      guideId: string | null;
      driverId: string | null;
      rentalGear: boolean;
      rentalDrone: boolean;
      rentalStarlink: boolean;
      rentalPowerbank: boolean;
      camelDollPurchased: boolean;
      depositAmountKrw: number | null;
      balanceAmountKrw: number | null;
      totalAmountKrw: number | null;
      securityDepositAmountKrw: number | null;
      groupTotalAmountKrw: number | null;
    }>,
  ) {
    return this.prisma.confirmedTrip.update({
      where: { id },
      data,
      include: confirmedTripInclude,
    });
  }
}
