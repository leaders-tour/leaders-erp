import type { Prisma, PrismaClient } from '@prisma/client';
import { planInclude } from './plan.mapper';
import type { PlanCreateDto, PlanUpdateDto } from './plan.types';

export class PlanRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  findMany() {
    return this.prisma.plan.findMany({ include: planInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.plan.findUnique({ where: { id }, include: planInclude });
  }

  create(data: PlanCreateDto) {
    const { planStops, ...planData } = data;

    return this.prisma.plan.create({
      data: {
        ...planData,
        planStops: {
          create: planStops.map((planStop) => ({
            dayIndex: planStop.dayIndex,
            fromLocationId: planStop.fromLocationId,
            toLocationId: planStop.toLocationId,
            lodgingId: planStop.lodgingId ?? null,
            mealSetId: planStop.mealSetId ?? null,
            distanceText: planStop.distanceText,
            lodgingText: planStop.lodgingText,
            mealsText: planStop.mealsText,
          })),
        },
      },
      include: planInclude,
    });
  }

  async replaceNested(id: string, data: PlanUpdateDto) {
    const { planStops, ...planData } = data;

    await this.prisma.plan.update({
      where: { id },
      data: planData,
    });

    if (planStops) {
      await this.prisma.planStop.deleteMany({ where: { planId: id } });

      await this.prisma.planStop.createMany({
        data: planStops.map((planStop) => ({
          planId: id,
          dayIndex: planStop.dayIndex,
          fromLocationId: planStop.fromLocationId,
          toLocationId: planStop.toLocationId,
          lodgingId: planStop.lodgingId ?? null,
          mealSetId: planStop.mealSetId ?? null,
          distanceText: planStop.distanceText,
          lodgingText: planStop.lodgingText,
          mealsText: planStop.mealsText,
        })),
      });
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.plan.delete({ where: { id } });
    return true;
  }
}
