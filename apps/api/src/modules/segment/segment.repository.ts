import type { Prisma, PrismaClient } from '@prisma/client';
import { segmentInclude } from './segment.mapper';
type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class SegmentRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter?: { regionIds?: string[] }) {
    return this.prisma.segment.findMany({
      where: filter?.regionIds?.length ? { regionId: { in: filter.regionIds } } : undefined,
      include: segmentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.segment.findUnique({ where: { id }, include: segmentInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.segment.delete({ where: { id } });
    return true;
  }
}
