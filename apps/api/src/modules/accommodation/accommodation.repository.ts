import type { AccommodationLevel, PrismaClient } from '@prisma/client';
import type {
  AccommodationCreateDto,
  AccommodationOptionCreateDto,
  AccommodationOptionUpdateDto,
  AccommodationUpdateDto,
} from './accommodation.types';

export class AccommodationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filters?: { region?: string; destination?: string; level?: AccommodationLevel }) {
    return this.prisma.accommodation.findMany({
      where: {
        ...(filters?.region ? { region: filters.region } : {}),
        ...(filters?.destination ? { destination: filters.destination } : {}),
      },
      include: {
        options: {
          where: filters?.level ? { level: filters.level } : undefined,
          orderBy: [{ bookingPriority: 'asc' }, { level: 'asc' }],
        },
      },
      orderBy: [{ region: 'asc' }, { destination: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.accommodation.findUnique({
      where: { id },
      include: { options: { orderBy: [{ bookingPriority: 'asc' }, { level: 'asc' }] } },
    });
  }

  create(data: AccommodationCreateDto) {
    return this.prisma.accommodation.create({ data, include: { options: true } });
  }

  update(id: string, data: AccommodationUpdateDto) {
    return this.prisma.accommodation.update({ where: { id }, data, include: { options: true } });
  }

  delete(id: string) {
    return this.prisma.accommodation.delete({ where: { id } });
  }

  findOptionsByAccommodationId(accommodationId: string) {
    return this.prisma.accommodationOption.findMany({
      where: { accommodationId },
      orderBy: [{ bookingPriority: 'asc' }, { level: 'asc' }],
    });
  }

  findOptionById(id: string) {
    return this.prisma.accommodationOption.findUnique({
      where: { id },
      include: { accommodation: true },
    });
  }

  createOption(data: AccommodationOptionCreateDto) {
    return this.prisma.accommodationOption.create({
      data: {
        accommodationId: data.accommodationId,
        roomType: data.roomType,
        level: data.level ?? 'LV3',
        priceOffSeason: data.priceOffSeason ?? null,
        pricePeakSeason: data.pricePeakSeason ?? null,
        paymentMethod: data.paymentMethod ?? null,
        mealCostPerServing: data.mealCostPerServing ?? null,
        capacity: data.capacity ?? null,
        mealIncluded: data.mealIncluded ?? false,
        bookingPriority: data.bookingPriority ?? null,
        googleMapsUrl: data.googleMapsUrl ?? null,
        imageUrls: data.imageUrls ?? [],
        note: data.note ?? null,
      },
      include: { accommodation: true },
    });
  }

  updateOption(id: string, data: AccommodationOptionUpdateDto) {
    return this.prisma.accommodationOption.update({
      where: { id },
      data: {
        ...(data.roomType !== undefined ? { roomType: data.roomType } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.priceOffSeason !== undefined ? { priceOffSeason: data.priceOffSeason } : {}),
        ...(data.pricePeakSeason !== undefined ? { pricePeakSeason: data.pricePeakSeason } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.mealCostPerServing !== undefined ? { mealCostPerServing: data.mealCostPerServing } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.mealIncluded !== undefined ? { mealIncluded: data.mealIncluded } : {}),
        ...(data.bookingPriority !== undefined ? { bookingPriority: data.bookingPriority } : {}),
        ...(data.googleMapsUrl !== undefined ? { googleMapsUrl: data.googleMapsUrl } : {}),
        ...(data.imageUrls !== undefined ? { imageUrls: data.imageUrls } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
      include: { accommodation: true },
    });
  }

  deleteOption(id: string) {
    return this.prisma.accommodationOption.delete({ where: { id } });
  }
}
