import type { PrismaClient } from '@prisma/client';
import { lodgingInclude } from './lodging.mapper';
import type { LodgingCreateDto, LodgingUpdateDto } from './lodging.types';

export class LodgingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.lodging.findMany({ include: lodgingInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.lodging.findUnique({ where: { id }, include: lodgingInclude });
  }

  create(data: LodgingCreateDto & { locationId: string; locationVersionId: string; locationNameSnapshot: string }) {
    return this.prisma.lodging.create({ data, include: lodgingInclude });
  }

  update(id: string, data: LodgingUpdateDto & { locationNameSnapshot?: string }) {
    return this.prisma.lodging.update({ where: { id }, data, include: lodgingInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.lodging.delete({ where: { id } });
    return true;
  }
}
