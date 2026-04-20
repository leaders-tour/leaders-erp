import type { AccommodationLevel, PaymentMethod } from '@prisma/client';

export interface AccommodationCreateDto {
  name: string;
  destination: string;
  region: string;
  phone?: string | null;
  facilities?: string | null;
  bookingMethod?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
}

export interface AccommodationUpdateDto {
  name?: string;
  destination?: string;
  region?: string;
  phone?: string | null;
  facilities?: string | null;
  bookingMethod?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
}

export interface AccommodationOptionCreateDto {
  accommodationId: string;
  roomType: string;
  level?: AccommodationLevel;
  priceOffSeason?: number | null;
  pricePeakSeason?: number | null;
  paymentMethod?: PaymentMethod | null;
  mealCostPerServing?: number | null;
  capacity?: string | null;
  mealIncluded?: boolean;
  bookingPriority?: string | null;
  googleMapsUrl?: string | null;
  imageUrls?: string[];
  note?: string | null;
}

export interface AccommodationOptionUpdateDto {
  roomType?: string;
  level?: AccommodationLevel;
  priceOffSeason?: number | null;
  pricePeakSeason?: number | null;
  paymentMethod?: PaymentMethod | null;
  mealCostPerServing?: number | null;
  capacity?: string | null;
  mealIncluded?: boolean;
  bookingPriority?: string | null;
  googleMapsUrl?: string | null;
  imageUrls?: string[];
  note?: string | null;
}

export interface AccommodationsFilterDto {
  region?: string;
  destination?: string;
  level?: AccommodationLevel;
}
