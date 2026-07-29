import type { ConfirmedTripStatus, LodgingAssignmentType, LodgingBookingStatus, Prisma, PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/** ConfirmedTrip.lodgings·lodging 단건 조회용 — 객실 옵션 선택 포함 */
export const confirmedTripLodgingInclude = {
  accommodation: true,
  optionAssignments: {
    orderBy: { id: 'asc' as const },
    include: { accommodationOption: true },
  },
} satisfies Prisma.ConfirmedTripLodgingInclude;

export const confirmedTripInclude = {
  user: { include: { ownerEmployee: true } },
  plan: { include: { regionSet: true } },
  planVersion: {
    include: {
      meta: { include: { transportGroups: { orderBy: { orderIndex: 'asc' as const } } } },
      pricing: {
        include: {
          securityDepositEvent: true,
          lines: { orderBy: { createdAt: 'asc' } },
        },
      },
      planStops: { orderBy: { id: 'asc' as const } },
      regionSet: true,
    },
  },
  confirmedByEmployee: true,
  guideAssignments: {
    orderBy: { sortOrder: 'asc' as const },
    include: { guide: true },
  },
  driverAssignments: {
    orderBy: { sortOrder: 'asc' as const },
    include: { driver: true },
  },
  koreaTeamStageSelections: {
    include: { option: true },
    orderBy: { option: { sortOrder: 'asc' as const } },
  },
  postTripTaskSelections: {
    include: { option: true },
    orderBy: { option: { sortOrder: 'asc' as const } },
  },
  lodgings: {
    include: confirmedTripLodgingInclude,
    orderBy: { dayIndex: 'asc' as const },
  },
} satisfies Prisma.ConfirmedTripInclude;

/** 투어 리스트 `confirmedTrips` 조회용 — 견적 라인·숙소 옵션 스택 등 생략. planStops는 목록용 최소 컬럼만. */
export const confirmedTripListInclude = {
  user: { include: { ownerEmployee: true } },
  plan: { include: { regionSet: true } },
  planVersion: {
    include: {
      meta: true,
      regionSet: true,
      planStops: {
        orderBy: { id: 'asc' as const },
        select: {
          rowType: true,
          dateCellText: true,
          destinationCellText: true,
        },
      },
    },
  },
  confirmedByEmployee: true,
  guideAssignments: {
    orderBy: { sortOrder: 'asc' as const },
    include: { guide: true },
  },
  driverAssignments: {
    orderBy: { sortOrder: 'asc' as const },
    include: { driver: true },
  },
  koreaTeamStageSelections: {
    include: { option: true },
    orderBy: { option: { sortOrder: 'asc' as const } },
  },
  postTripTaskSelections: {
    include: { option: true },
    orderBy: { option: { sortOrder: 'asc' as const } },
  },
  lodgings: {
    orderBy: { dayIndex: 'asc' as const },
    include: {
      accommodation: {
        select: {
          id: true,
          name: true,
          coverImageUrl: true,
        },
      },
      optionAssignments: {
        orderBy: { id: 'asc' as const },
        select: {
          id: true,
          roomCount: true,
          accommodationOptionId: true,
        },
      },
    },
  },
} satisfies Prisma.ConfirmedTripInclude;

/** 진행단계·종료 후 안내 선택만 갱신할 때 — planVersion·lodgings 등 생략 */
export const confirmedTripSelectionOnlyInclude = {
  koreaTeamStageSelections: {
    include: { option: true },
    orderBy: { option: { sortOrder: 'asc' as const } },
  },
  postTripTaskSelections: {
    include: { option: true },
    orderBy: { option: { sortOrder: 'asc' as const } },
  },
} satisfies Prisma.ConfirmedTripInclude;

/** CalendarNote → confirmedTrip 서브셋 (GraphQL `ConfirmedTrip.user` 필수 등) */
export const calendarNoteConfirmedTripInclude = {
  user: true,
  planVersion: {
    include: {
      meta: true,
    },
  },
} satisfies Prisma.ConfirmedTripInclude;

export class ConfirmedTripRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(status?: ConfirmedTripStatus) {
    return this.prisma.confirmedTrip.findMany({
      where: status ? { status } : undefined,
      include: confirmedTripListInclude,
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

  findActiveByPlanVersionId(planVersionId: string) {
    return this.prisma.confirmedTrip.findFirst({
      where: { planVersionId, status: 'ACTIVE' },
      include: confirmedTripInclude,
    });
  }

  findByGuideId(guideId: string, includeCancelled = false) {
    return this.prisma.confirmedTrip.findMany({
      where: {
        guideAssignments: { some: { guideId } },
        ...(includeCancelled ? {} : { status: 'ACTIVE' }),
      },
      include: confirmedTripInclude,
      orderBy: [{ travelStart: 'asc' }, { confirmedAt: 'desc' }],
    });
  }

  findByDriverId(driverId: string, includeCancelled = false) {
    return this.prisma.confirmedTrip.findMany({
      where: {
        driverAssignments: { some: { driverId } },
        ...(includeCancelled ? {} : { status: 'ACTIVE' }),
      },
      include: confirmedTripInclude,
      orderBy: [{ travelStart: 'asc' }, { confirmedAt: 'desc' }],
    });
  }

  create(data: {
    userId: string;
    planId?: string | null;
    planVersionId?: string | null;
    confirmedByEmployeeId?: string | null;
    travelStart?: Date | null;
    travelEnd?: Date | null;
    destination?: string | null;
    paxCount?: number | null;
    totalAmountKrw?: number | null;
    depositAmountKrw?: number | null;
    balanceAmountKrw?: number | null;
    securityDepositAmountKrw?: number | null;
    rentalDrone?: boolean;
    rentalStarlink?: boolean;
    rentalPowerbank?: boolean;
  }) {
    return this.prisma.confirmedTrip.create({
      data: {
        userId: data.userId,
        planId: data.planId ?? null,
        planVersionId: data.planVersionId ?? null,
        confirmedByEmployeeId: data.confirmedByEmployeeId ?? null,
        travelStart: data.travelStart ?? null,
        travelEnd: data.travelEnd ?? null,
        destination: data.destination ?? null,
        paxCount: data.paxCount ?? null,
        totalAmountKrw: data.totalAmountKrw ?? null,
        depositAmountKrw: data.depositAmountKrw ?? null,
        balanceAmountKrw: data.balanceAmountKrw ?? null,
        securityDepositAmountKrw: data.securityDepositAmountKrw ?? null,
        ...(data.rentalDrone !== undefined ? { rentalDrone: data.rentalDrone } : {}),
        ...(data.rentalStarlink !== undefined ? { rentalStarlink: data.rentalStarlink } : {}),
        ...(data.rentalPowerbank !== undefined ? { rentalPowerbank: data.rentalPowerbank } : {}),
      },
      include: confirmedTripInclude,
    });
  }

  findLodgingById(id: string) {
    return this.prisma.confirmedTripLodging.findUnique({
      where: { id },
      include: { ...confirmedTripLodgingInclude, confirmedTrip: true },
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
      });
    }
    return this.prisma.confirmedTripLodging.create({
      data: rest,
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
      assignedVehicle: string | null;
      accommodationNote: string | null;
      operationNote: string | null;
      openChatUrl: string | null;
      confirmedAt: Date;
      status: ConfirmedTripStatus;
      travelStart: Date | null;
      travelEnd: Date | null;
      pickupDate: Date | null;
      dropDate: Date | null;
      destination: string | null;
      paxCount: number | null;
      rentalGear: boolean;
      rentalDrone: boolean;
      rentalStarlink: boolean;
      rentalPowerbank: boolean;
      camelDollPurchased: boolean;
      isRecruitingOpen: boolean;
      depositAmountKrw: number | null;
      balanceAmountKrw: number | null;
      totalAmountKrw: number | null;
      securityDepositAmountKrw: number | null;
      groupTotalAmountKrw: number | null;
      planId: string | null;
      planVersionId: string | null;
    }>,
  ) {
    return this.prisma.confirmedTrip.update({
      where: { id },
      data,
      include: confirmedTripInclude,
    });
  }
}
