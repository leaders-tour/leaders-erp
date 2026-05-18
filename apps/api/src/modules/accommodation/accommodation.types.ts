import type { AccommodationLevel, PaymentMethod } from '@prisma/client';

export interface AccommodationCreateDto {
  name: string;
  destination: string;
  region: string;
  phone?: string | null;
  facilities?: string | null;
  bookingMethod?: string | null;
  bookingPriority?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
}

export interface AccommodationUpdateDto {
  name?: string;
  destination?: string;
  region?: string;
  coverImageUrl?: string | null;
  phone?: string | null;
  facilities?: string | null;
  bookingMethod?: string | null;
  bookingPriority?: string | null;
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
  capacity?: number | null;
  mealIncluded?: boolean;
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
  capacity?: number | null;
  mealIncluded?: boolean;
  googleMapsUrl?: string | null;
  imageUrls?: string[];
  note?: string | null;
}

export interface AccommodationsFilterDto {
  region?: string;
  destination?: string;
  level?: AccommodationLevel;
  /** Exact match (e.g. 1순위, 2순위). Ignored when bookingPriorityUnset is true. */
  bookingPriority?: string;
  /** When true, only accommodations with null bookingPriority */
  bookingPriorityUnset?: boolean;
}
