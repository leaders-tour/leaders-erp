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
    const { dayPlans, ...planData } = data;

    return this.prisma.plan.create({
      data: {
        ...planData,
        dayPlans: {
          create: dayPlans.map((dayPlan) => ({
            dayIndex: dayPlan.dayIndex,
            fromLocationId: dayPlan.fromLocationId,
            toLocationId: dayPlan.toLocationId,
            distanceText: dayPlan.distanceText,
            lodgingText: dayPlan.lodgingText,
            mealsText: dayPlan.mealsText,
            timeBlocks: {
              create: dayPlan.timeBlocks.map((timeBlock) => ({
                startTime: timeBlock.startTime,
                label: timeBlock.label,
                orderIndex: timeBlock.orderIndex,
                activities: {
                  create: timeBlock.activities.map((activity) => ({
                    description: activity.description,
                    orderIndex: activity.orderIndex,
                    isOptional: activity.isOptional,
                    conditionNote: activity.conditionNote,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: planInclude,
    });
  }

  async replaceNested(id: string, data: PlanUpdateDto) {
    const { dayPlans, ...planData } = data;

    await this.prisma.plan.update({
      where: { id },
      data: planData,
    });

    if (dayPlans) {
      const existingDayPlans = await this.prisma.dayPlan.findMany({ where: { planId: id }, select: { id: true } });
      const dayPlanIds = existingDayPlans.map((dayPlan) => dayPlan.id);

      if (dayPlanIds.length > 0) {
        const timeBlocks = await this.prisma.timeBlock.findMany({
          where: { dayPlanId: { in: dayPlanIds } },
          select: { id: true },
        });
        const timeBlockIds = timeBlocks.map((timeBlock) => timeBlock.id);

        if (timeBlockIds.length > 0) {
          await this.prisma.activity.deleteMany({ where: { timeBlockId: { in: timeBlockIds } } });
        }

        await this.prisma.timeBlock.deleteMany({ where: { dayPlanId: { in: dayPlanIds } } });
        await this.prisma.dayPlan.deleteMany({ where: { id: { in: dayPlanIds } } });
      }

      await this.prisma.dayPlan.createMany({
        data: dayPlans.map((dayPlan) => ({
          planId: id,
          dayIndex: dayPlan.dayIndex,
          fromLocationId: dayPlan.fromLocationId,
          toLocationId: dayPlan.toLocationId,
          distanceText: dayPlan.distanceText,
          lodgingText: dayPlan.lodgingText,
          mealsText: dayPlan.mealsText,
        })),
      });

      const freshDayPlans = await this.prisma.dayPlan.findMany({ where: { planId: id }, orderBy: { dayIndex: 'asc' } });
      for (const dayPlan of freshDayPlans) {
        const source = dayPlans.find((item) => item.dayIndex === dayPlan.dayIndex);
        if (!source) {
          continue;
        }

        for (const timeBlock of source.timeBlocks) {
          const createdTimeBlock = await this.prisma.timeBlock.create({
            data: {
              dayPlanId: dayPlan.id,
              startTime: timeBlock.startTime,
              label: timeBlock.label,
              orderIndex: timeBlock.orderIndex,
            },
          });

          if (timeBlock.activities.length > 0) {
            await this.prisma.activity.createMany({
              data: timeBlock.activities.map((activity) => ({
                timeBlockId: createdTimeBlock.id,
                description: activity.description,
                orderIndex: activity.orderIndex,
                isOptional: activity.isOptional,
                conditionNote: activity.conditionNote,
              })),
            });
          }
        }
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.plan.delete({ where: { id } });
    return true;
  }
}
