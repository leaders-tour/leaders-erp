import type { Prisma, PrismaClient } from '@prisma/client';
import { segmentInclude } from './segment.mapper';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class SegmentRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany() {
    return this.prisma.segment.findMany({ include: segmentInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.segment.findUnique({ where: { id }, include: segmentInclude });
  }

  create(data: SegmentCreateDto & { regionName: string }) {
    return this.prisma.segment.create({ data, include: segmentInclude });
  }

  update(id: string, data: SegmentUpdateDto & { regionName?: string }) {
    return this.prisma.segment.update({ where: { id }, data, include: segmentInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.segment.delete({ where: { id } });
    return true;
  }
}
