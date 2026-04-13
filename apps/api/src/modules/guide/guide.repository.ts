import type { GuideLevel, GuideStatus, PrismaClient } from '@prisma/client';
import type { GuideCreateDto, GuideUpdateDto } from './guide.types';

export class GuideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filters?: { status?: GuideStatus; level?: GuideLevel }) {
    return this.prisma.guide.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.level ? { level: filters.level } : {}),
      },
      orderBy: [{ status: 'asc' }, { level: 'asc' }, { nameKo: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.guide.findUnique({ where: { id } });
  }

  create(data: GuideCreateDto) {
    return this.prisma.guide.create({
      data: {
        nameKo: data.nameKo,
        nameMn: data.nameMn ?? null,
        level: data.level ?? 'OTHER',
        status: data.status ?? 'OTHER',
        gender: data.gender ?? null,
        birthYear: data.birthYear ?? null,
        isSmoker: data.isSmoker ?? false,
        experienceYears: data.experienceYears ?? null,
        joinYear: data.joinYear ?? null,
        phone: data.phone ?? null,
        profileImageUrl: data.profileImageUrl ?? null,
        certImageUrls: data.certImageUrls ?? [],
        note: data.note ?? null,
      },
    });
  }

  update(id: string, data: GuideUpdateDto) {
    return this.prisma.guide.update({
      where: { id },
      data: {
        ...(data.nameKo !== undefined ? { nameKo: data.nameKo } : {}),
        ...(data.nameMn !== undefined ? { nameMn: data.nameMn } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.birthYear !== undefined ? { birthYear: data.birthYear } : {}),
        ...(data.isSmoker !== undefined ? { isSmoker: data.isSmoker } : {}),
        ...(data.experienceYears !== undefined ? { experienceYears: data.experienceYears } : {}),
        ...(data.joinYear !== undefined ? { joinYear: data.joinYear } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.profileImageUrl !== undefined ? { profileImageUrl: data.profileImageUrl } : {}),
        ...(data.certImageUrls !== undefined ? { certImageUrls: data.certImageUrls } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
  }

  delete(id: string) {
    return this.prisma.guide.delete({ where: { id } });
  }
}
