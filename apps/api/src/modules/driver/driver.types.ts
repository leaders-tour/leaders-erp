import type { DriverLevel, DriverStatus, GuideGender, VehicleType } from '@prisma/client';

export interface DriverCreateDto {
  nameMn: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string | null;
  vehicleOptions?: string | null;
  vehicleYear?: number | null;
  maxPassengers?: number | null;
  level?: DriverLevel;
  status?: DriverStatus;
  gender?: GuideGender | null;
  birthYear?: number | null;
  isSmoker?: boolean;
  hasTouristLicense?: boolean;
  joinYear?: number | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  vehicleImageUrls?: string[];
  note?: string | null;
}

export interface DriverUpdateDto {
  nameMn?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string | null;
  vehicleOptions?: string | null;
  vehicleYear?: number | null;
  maxPassengers?: number | null;
  level?: DriverLevel;
  status?: DriverStatus;
  gender?: GuideGender | null;
  birthYear?: number | null;
  isSmoker?: boolean;
  hasTouristLicense?: boolean;
  joinYear?: number | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  vehicleImageUrls?: string[];
  note?: string | null;
}

export interface DriversFilterDto {
  status?: DriverStatus;
  level?: DriverLevel;
  vehicleType?: VehicleType;
}
