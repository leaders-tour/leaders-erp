import type { PrismaClient } from '@prisma/client';
import { activityInclude } from './activity.mapper';
import type { ActivityCreateDto, ActivityUpdateDto } from './activity.types';

export class ActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.activity.findMany({ include: activityInclude, orderBy: { orderIndex: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.activity.findUnique({ where: { id }, include: activityInclude });
  }

  create(data: ActivityCreateDto) {
    return this.prisma.activity.create({ data, include: activityInclude });
  }

  update(id: string, data: ActivityUpdateDto) {
    return this.prisma.activity.update({ where: { id }, data, include: activityInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.activity.delete({ where: { id } });
    return true;
  }
}
