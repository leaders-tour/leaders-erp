import type { DriverLevel, DriverStatus, PrismaClient, VehicleType } from '@prisma/client';
import type { DriverCreateDto, DriverUpdateDto } from './driver.types';

export class DriverRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filters?: { status?: DriverStatus; level?: DriverLevel; vehicleType?: VehicleType }) {
    return this.prisma.driver.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.level ? { level: filters.level } : {}),
        ...(filters?.vehicleType ? { vehicleType: filters.vehicleType } : {}),
      },
      orderBy: [{ status: 'asc' }, { level: 'asc' }, { nameMn: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  create(data: DriverCreateDto) {
    return this.prisma.driver.create({
      data: {
        nameMn: data.nameMn,
        vehicleType: data.vehicleType ?? 'OTHER',
        vehicleNumber: data.vehicleNumber ?? null,
        vehicleOptions: data.vehicleOptions ?? null,
        vehicleYear: data.vehicleYear ?? null,
        maxPassengers: data.maxPassengers ?? null,
        level: data.level ?? 'OTHER',
        status: data.status ?? 'OTHER',
        gender: data.gender ?? null,
        birthYear: data.birthYear ?? null,
        isSmoker: data.isSmoker ?? false,
        hasTouristLicense: data.hasTouristLicense ?? false,
        joinYear: data.joinYear ?? null,
        phone: data.phone ?? null,
        profileImageUrl: data.profileImageUrl ?? null,
        vehicleImageUrls: data.vehicleImageUrls ?? [],
        note: data.note ?? null,
      },
    });
  }

  update(id: string, data: DriverUpdateDto) {
    return this.prisma.driver.update({
      where: { id },
      data: {
        ...(data.nameMn !== undefined ? { nameMn: data.nameMn } : {}),
        ...(data.vehicleType !== undefined ? { vehicleType: data.vehicleType } : {}),
        ...(data.vehicleNumber !== undefined ? { vehicleNumber: data.vehicleNumber } : {}),
        ...(data.vehicleOptions !== undefined ? { vehicleOptions: data.vehicleOptions } : {}),
        ...(data.vehicleYear !== undefined ? { vehicleYear: data.vehicleYear } : {}),
        ...(data.maxPassengers !== undefined ? { maxPassengers: data.maxPassengers } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.birthYear !== undefined ? { birthYear: data.birthYear } : {}),
        ...(data.isSmoker !== undefined ? { isSmoker: data.isSmoker } : {}),
        ...(data.hasTouristLicense !== undefined ? { hasTouristLicense: data.hasTouristLicense } : {}),
        ...(data.joinYear !== undefined ? { joinYear: data.joinYear } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.profileImageUrl !== undefined ? { profileImageUrl: data.profileImageUrl } : {}),
        ...(data.vehicleImageUrls !== undefined ? { vehicleImageUrls: data.vehicleImageUrls } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
  }

  delete(id: string) {
    return this.prisma.driver.delete({ where: { id } });
  }
}
