import type { PrismaClient } from '@prisma/client';
import { timeBlockInclude } from './time-block.mapper';
import type { TimeBlockCreateDto, TimeBlockUpdateDto } from './time-block.types';

export class TimeBlockRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.timeBlock.findMany({ include: timeBlockInclude, orderBy: { orderIndex: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.timeBlock.findUnique({ where: { id }, include: timeBlockInclude });
  }

  create(data: TimeBlockCreateDto) {
    return this.prisma.timeBlock.create({ data, include: timeBlockInclude });
  }

  update(id: string, data: TimeBlockUpdateDto) {
    return this.prisma.timeBlock.update({ where: { id }, data, include: timeBlockInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.timeBlock.delete({ where: { id } });
    return true;
  }
}
