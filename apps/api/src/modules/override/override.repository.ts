import type { PrismaClient } from '@prisma/client';
import { overrideInclude } from './override.mapper';
import type { OverrideCreateDto, OverrideUpdateDto } from './override.types';

export class OverrideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.override.findMany({ include: overrideInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.override.findUnique({ where: { id }, include: overrideInclude });
  }

  create(data: OverrideCreateDto) {
    return this.prisma.override.create({ data, include: overrideInclude });
  }

  update(id: string, data: OverrideUpdateDto) {
    return this.prisma.override.update({ where: { id }, data, include: overrideInclude });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.override.delete({ where: { id } });
    return true;
  }
}
