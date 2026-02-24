import type { PrismaClient } from '@prisma/client';

export class LocationGuideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany() {
    return this.prisma.locationGuide.findMany({
      include: { location: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.locationGuide.findUnique({
      where: { id },
      include: { location: true },
    });
  }

  findByLocationId(locationId: string) {
    return this.prisma.locationGuide.findUnique({
      where: { locationId },
      include: { location: true },
    });
  }

  create(data: {
    title: string;
    description: string;
    imageUrls: string[];
    locationId?: string | null;
  }) {
    return this.prisma.locationGuide.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrls: data.imageUrls,
        locationId: data.locationId ?? null,
      },
      include: { location: true },
    });
  }

  update(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrls?: string[];
      locationId?: string | null;
    },
  ) {
    return this.prisma.locationGuide.update({
      where: { id },
      data,
      include: { location: true },
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.locationGuide.delete({ where: { id } });
    return true;
  }
}
