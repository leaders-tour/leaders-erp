import type { Prisma, PrismaClient } from '@prisma/client';
import { overnightStayConnectionInclude, overnightStayInclude } from './overnight-stay.mapper';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

interface OvernightStayListFilter {
  regionId?: string;
  activeOnly?: boolean;
}

interface OvernightStayConnectionListFilter {
  regionId?: string;
  fromOvernightStayId?: string;
}

export class OvernightStayRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter: OvernightStayListFilter) {
    return this.prisma.overnightStay.findMany({
      where: {
        ...(filter.regionId ? { regionId: filter.regionId } : {}),
        ...(filter.activeOnly ? { isActive: true } : {}),
      },
      include: overnightStayInclude,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.overnightStay.findUnique({
      where: { id },
      include: overnightStayInclude,
    });
  }

  async replaceDays(
    overnightStayId: string,
    days: Array<{
      dayOrder: number;
      averageDistanceKm: number;
      averageTravelHours: number;
      timeCellText: string;
      scheduleCellText: string;
      lodgingCellText: string;
      mealCellText: string;
    }>,
  ) {
    await this.prisma.overnightStayDay.deleteMany({ where: { overnightStayId } });
    await this.prisma.overnightStayDay.createMany({
      data: days.map((day) => ({
        overnightStayId,
        dayOrder: day.dayOrder,
        averageDistanceKm: day.averageDistanceKm,
        averageTravelHours: day.averageTravelHours,
        timeCellText: day.timeCellText,
        scheduleCellText: day.scheduleCellText,
        lodgingCellText: day.lodgingCellText,
        mealCellText: day.mealCellText,
      })),
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.overnightStay.delete({ where: { id } });
    return true;
  }
}

export class OvernightStayConnectionRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter: OvernightStayConnectionListFilter) {
    return this.prisma.overnightStayConnection.findMany({
      where: {
        ...(filter.regionId ? { regionId: filter.regionId } : {}),
        ...(filter.fromOvernightStayId ? { fromOvernightStayId: filter.fromOvernightStayId } : {}),
      },
      include: overnightStayConnectionInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.overnightStayConnection.findUnique({
      where: { id },
      include: overnightStayConnectionInclude,
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.overnightStayConnection.delete({ where: { id } });
    return true;
  }
}
