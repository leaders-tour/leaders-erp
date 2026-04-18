import type { DriverLevel, DriverStatus, VehicleType } from '@prisma/client';
import type { AppContext } from '../../context';
import type { UploadFile } from '../../lib/file-storage/client';
import { DriverService } from './driver.service';
import type { DriverCreateDto, DriversFilterDto, DriverUpdateDto } from './driver.types';

interface DriversArgs {
  status?: DriverStatus;
  level?: DriverLevel;
  vehicleType?: VehicleType;
}

interface DriverIdArgs {
  id: string;
}

interface DriverCreateArgs {
  input: DriverCreateDto;
}

interface DriverUpdateArgs {
  id: string;
  input: DriverUpdateDto;
}

export const driverResolver = {
  Query: {
    drivers: (_parent: unknown, args: DriversArgs, ctx: AppContext) => {
      const filters: DriversFilterDto = {};
      if (args.status) filters.status = args.status;
      if (args.level) filters.level = args.level;
      if (args.vehicleType) filters.vehicleType = args.vehicleType;
      return new DriverService(ctx.prisma).list(filters);
    },
    driver: (_parent: unknown, args: DriverIdArgs, ctx: AppContext) =>
      new DriverService(ctx.prisma).get(args.id),
  },
  Mutation: {
    createDriver: (_parent: unknown, args: DriverCreateArgs, ctx: AppContext) =>
      new DriverService(ctx.prisma).create(args.input),
    updateDriver: (_parent: unknown, args: DriverUpdateArgs, ctx: AppContext) =>
      new DriverService(ctx.prisma).update(args.id, args.input),
    deleteDriver: (_parent: unknown, args: DriverIdArgs, ctx: AppContext) =>
      new DriverService(ctx.prisma).delete(args.id),
    uploadDriverProfileImage: (_parent: unknown, args: { id: string; image: UploadFile | Promise<UploadFile> }, ctx: AppContext) =>
      new DriverService(ctx.prisma).uploadProfileImage(args.id, args.image),
    uploadDriverVehicleImages: (_parent: unknown, args: { id: string; images: (UploadFile | Promise<UploadFile>)[] }, ctx: AppContext) =>
      new DriverService(ctx.prisma).uploadVehicleImages(args.id, args.images),
    removeDriverVehicleImage: (_parent: unknown, args: { id: string; imageUrl: string }, ctx: AppContext) =>
      new DriverService(ctx.prisma).removeVehicleImage(args.id, args.imageUrl),
  },

  Driver: {
    vehicleImageUrls: (parent: { vehicleImageUrls: unknown }) => {
      if (Array.isArray(parent.vehicleImageUrls)) return parent.vehicleImageUrls;
      if (typeof parent.vehicleImageUrls === 'string') {
        try { return JSON.parse(parent.vehicleImageUrls); } catch { return []; }
      }
      return [];
    },
  },
};
