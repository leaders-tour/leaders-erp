import type { ConfirmedTripStatus, Prisma, PrismaClient } from '@prisma/client';

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
} satisfies Prisma.ConfirmedTripInclude;

export class ConfirmedTripRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(status?: ConfirmedTripStatus) {
    return this.prisma.confirmedTrip.findMany({
      where: status ? { status } : undefined,
      include: confirmedTripInclude,
      orderBy: [{ confirmedAt: 'desc' }],
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

  update(
    id: string,
    data: Partial<{
      guideName: string | null;
      driverName: string | null;
      assignedVehicle: string | null;
      accommodationNote: string | null;
      operationNote: string | null;
      status: ConfirmedTripStatus;
    }>,
  ) {
    return this.prisma.confirmedTrip.update({
      where: { id },
      data,
      include: confirmedTripInclude,
    });
  }
}
