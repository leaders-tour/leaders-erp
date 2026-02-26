import type { Prisma, PrismaClient } from '@prisma/client';
import { eventInclude } from './event.mapper';
import type { EventCreateDto, EventUpdateDto } from './event.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class EventRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(activeOnly?: boolean) {
    return this.prisma.event.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: eventInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.event.findUnique({ where: { id }, include: eventInclude });
  }

  create(data: EventCreateDto) {
    return this.prisma.event.create({ data, include: eventInclude });
  }

  update(id: string, data: EventUpdateDto) {
    return this.prisma.event.update({ where: { id }, data, include: eventInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.event.delete({ where: { id } });
    return true;
  }

  countPlanVersionReferences(id: string): Promise<number> {
    return this.prisma.planVersionEvent.count({ where: { eventId: id } });
  }
}
