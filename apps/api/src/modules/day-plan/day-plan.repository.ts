import type { PrismaClient } from '@prisma/client';
import { dayPlanInclude } from './day-plan.mapper';
import type { DayPlanCreateDto, DayPlanUpdateDto } from './day-plan.types';

export class DayPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.dayPlan.findMany({ include: dayPlanInclude, orderBy: { dayIndex: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.dayPlan.findUnique({ where: { id }, include: dayPlanInclude });
  }

  create(data: DayPlanCreateDto) {
    return this.prisma.dayPlan.create({ data, include: dayPlanInclude });
  }

  update(id: string, data: DayPlanUpdateDto) {
    return this.prisma.dayPlan.update({ where: { id }, data, include: dayPlanInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.dayPlan.delete({ where: { id } });
    return true;
  }
}
