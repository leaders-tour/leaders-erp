import type { PrismaClient } from '@prisma/client';

export class SafetyNoticeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.safetyNotice.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.safetyNotice.findUnique({ where: { id } });
  }

  create(data: { title: string; contentMd: string; imageUrls: string[] }) {
    return this.prisma.safetyNotice.create({ data });
  }

  update(id: string, data: { title?: string; contentMd?: string; imageUrls?: string[] }) {
    return this.prisma.safetyNotice.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.safetyNotice.delete({ where: { id } });
    return true;
  }
}
