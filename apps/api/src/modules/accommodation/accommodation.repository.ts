import type { AccommodationLevel, PrismaClient } from '@prisma/client';
import type {
  AccommodationCreateDto,
  AccommodationOptionCreateDto,
  AccommodationOptionUpdateDto,
  AccommodationUpdateDto,
} from './accommodation.types';

const OPTION_ORDER_BY = [{ level: 'asc' as const }, { roomType: 'asc' as const }, { id: 'asc' as const }];

export class AccommodationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filters?: {
    region?: string;
    destination?: string;
    level?: AccommodationLevel;
    bookingPriority?: string;
    bookingPriorityUnset?: boolean;
  }) {
    const bookingWhere =
      filters?.bookingPriorityUnset === true
        ? { bookingPriority: null }
        : filters?.bookingPriority != null && filters.bookingPriority !== ''
          ? { bookingPriority: filters.bookingPriority }
          : {};
    return this.prisma.accommodation.findMany({
      where: {
        ...(filters?.region ? { region: filters.region } : {}),
        ...(filters?.destination ? { destination: filters.destination } : {}),
        ...bookingWhere,
      },
      include: {
        options: {
          where: filters?.level ? { level: filters.level } : undefined,
          orderBy: OPTION_ORDER_BY,
        },
      },
      orderBy: [{ region: 'asc' }, { destination: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.accommodation.findUnique({
      where: { id },
      include: { options: { orderBy: OPTION_ORDER_BY } },
    });
  }

  create(data: AccommodationCreateDto) {
    return this.prisma.accommodation.create({
      data: {
        name: data.name,
        destination: data.destination,
        region: data.region,
        phone: data.phone ?? null,
        facilities: data.facilities ?? null,
        bookingMethod: data.bookingMethod ?? null,
        bookingPriority: data.bookingPriority ?? null,
        openingDate: data.openingDate ?? null,
        closingDate: data.closingDate ?? null,
      },
      include: { options: true },
    });
  }

  update(id: string, data: AccommodationUpdateDto) {
    return this.prisma.accommodation.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.destination !== undefined ? { destination: data.destination } : {}),
        ...(data.region !== undefined ? { region: data.region } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.facilities !== undefined ? { facilities: data.facilities } : {}),
        ...(data.bookingMethod !== undefined ? { bookingMethod: data.bookingMethod } : {}),
        ...(data.bookingPriority !== undefined ? { bookingPriority: data.bookingPriority } : {}),
        ...(data.openingDate !== undefined ? { openingDate: data.openingDate } : {}),
        ...(data.closingDate !== undefined ? { closingDate: data.closingDate } : {}),
      },
      include: { options: true },
    });
  }

  delete(id: string) {
    return this.prisma.accommodation.delete({ where: { id } });
  }

  findOptionsByAccommodationId(accommodationId: string) {
    return this.prisma.accommodationOption.findMany({
      where: { accommodationId },
      orderBy: OPTION_ORDER_BY,
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
