import type { PrismaClient } from '@prisma/client';
import { mealSetInclude } from './meal-set.mapper';
import type { MealSetCreateDto, MealSetUpdateDto } from './meal-set.types';

export class MealSetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.mealSet.findMany({ include: mealSetInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.mealSet.findUnique({ where: { id }, include: mealSetInclude });
  }

  create(data: MealSetCreateDto & { locationNameSnapshot: string }) {
    return this.prisma.mealSet.create({ data, include: mealSetInclude });
  }

  update(id: string, data: MealSetUpdateDto & { locationNameSnapshot?: string }) {
    return this.prisma.mealSet.update({ where: { id }, data, include: mealSetInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.mealSet.delete({ where: { id } });
    return true;
  }
}
