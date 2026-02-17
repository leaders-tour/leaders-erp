import type { PrismaClient } from '@prisma/client';
import { segmentInclude } from './segment.mapper';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

export class SegmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.segment.findMany({ include: segmentInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.segment.findUnique({ where: { id }, include: segmentInclude });
  }

  create(data: SegmentCreateDto) {
    return this.prisma.segment.create({ data, include: segmentInclude });
  }

  update(id: string, data: SegmentUpdateDto) {
    return this.prisma.segment.update({ where: { id }, data, include: segmentInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.segment.delete({ where: { id } });
    return true;
  }
}
