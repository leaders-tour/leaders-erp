import type { MovementIntensity, Prisma, PrismaClient } from '@prisma/client';
import { multiDayBlockConnectionInclude, multiDayBlockInclude } from './multi-day-block.mapper';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

interface MultiDayBlockListFilter {
  regionIds?: string[];
  activeOnly?: boolean;
}

interface MultiDayBlockConnectionListFilter {
  regionIds?: string[];
  fromMultiDayBlockId?: string;
}

export class MultiDayBlockRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter: MultiDayBlockListFilter) {
    return this.prisma.overnightStay.findMany({
      where: {
        ...(filter.regionIds?.length ? { regionId: { in: filter.regionIds } } : {}),
        ...(filter.activeOnly ? { isActive: true } : {}),
      },
      include: multiDayBlockInclude,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.overnightStay.findUnique({
      where: { id },
      include: multiDayBlockInclude,
    });
  }

  async replaceDays(
    overnightStayId: string,
    days: Array<{
      dayOrder: number;
      displayLocationId: string;
      averageDistanceKm: number;
      averageTravelHours: number;
      movementIntensity: MovementIntensity;
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
        displayLocationId: day.displayLocationId,
        averageDistanceKm: day.averageDistanceKm,
        averageTravelHours: day.averageTravelHours,
        movementIntensity: day.movementIntensity,
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

export class MultiDayBlockConnectionRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter: MultiDayBlockConnectionListFilter) {
    return this.prisma.overnightStayConnection.findMany({
      where: {
        ...(filter.regionIds?.length
          ? {
              OR: [
                { regionId: { in: filter.regionIds } },
                { fromOvernightStay: { regionId: { in: filter.regionIds } } },
                { toLocation: { regionId: { in: filter.regionIds } } },
              ],
            }
          : {}),
        ...(filter.fromMultiDayBlockId ? { fromOvernightStayId: filter.fromMultiDayBlockId } : {}),
      },
      include: multiDayBlockConnectionInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.overnightStayConnection.findUnique({
      where: { id },
      include: multiDayBlockConnectionInclude,
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.overnightStayConnection.delete({ where: { id } });
    return true;
  }
}
