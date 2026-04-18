import type { AccommodationLevel } from '@prisma/client';
import type { AppContext } from '../../context';
import type { UploadFile } from '../../lib/file-storage/client';
import { AccommodationService } from './accommodation.service';
import type {
  AccommodationCreateDto,
  AccommodationOptionCreateDto,
  AccommodationOptionUpdateDto,
  AccommodationsFilterDto,
  AccommodationUpdateDto,
} from './accommodation.types';

export const accommodationResolver = {
  Query: {
    accommodations: (
      _parent: unknown,
      args: { region?: string; destination?: string; level?: AccommodationLevel },
      ctx: AppContext,
    ) => {
      const filters: AccommodationsFilterDto = {};
      if (args.region) filters.region = args.region;
      if (args.destination) filters.destination = args.destination;
      if (args.level) filters.level = args.level;
      return new AccommodationService(ctx.prisma).list(filters);
    },
    accommodation: (_parent: unknown, args: { id: string }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).get(args.id),
    accommodationOptions: (_parent: unknown, args: { accommodationId: string }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).listOptions(args.accommodationId),
    accommodationOption: (_parent: unknown, args: { id: string }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).getOption(args.id),
  },

  Mutation: {
    createAccommodation: (_parent: unknown, args: { input: AccommodationCreateDto }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).create(args.input),
    updateAccommodation: (_parent: unknown, args: { id: string; input: AccommodationUpdateDto }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).update(args.id, args.input),
    deleteAccommodation: (_parent: unknown, args: { id: string }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).delete(args.id),
    createAccommodationOption: (_parent: unknown, args: { input: AccommodationOptionCreateDto }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).createOption(args.input),
    updateAccommodationOption: (_parent: unknown, args: { id: string; input: AccommodationOptionUpdateDto }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).updateOption(args.id, args.input),
    deleteAccommodationOption: (_parent: unknown, args: { id: string }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).deleteOption(args.id),
    uploadAccommodationOptionImages: (_parent: unknown, args: { id: string; images: (UploadFile | Promise<UploadFile>)[] }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).uploadOptionImages(args.id, args.images),
    removeAccommodationOptionImage: (_parent: unknown, args: { id: string; imageUrl: string }, ctx: AppContext) =>
      new AccommodationService(ctx.prisma).removeOptionImage(args.id, args.imageUrl),
  },

  Accommodation: {
    options: (parent: { id: string; options?: unknown[] }, _args: unknown, ctx: AppContext) => {
      if (Array.isArray(parent.options)) return parent.options;
      return new AccommodationService(ctx.prisma).listOptions(parent.id);
    },
  },

  AccommodationOption: {
    imageUrls: (parent: { imageUrls: unknown }) => {
      if (Array.isArray(parent.imageUrls)) return parent.imageUrls;
      if (typeof parent.imageUrls === 'string') {
        try { return JSON.parse(parent.imageUrls); } catch { return []; }
      }
      return [];
    },
    accommodation: (parent: { accommodationId: string; accommodation?: unknown }, _args: unknown, ctx: AppContext) => {
      if (parent.accommodation) return parent.accommodation;
      return new AccommodationService(ctx.prisma).get(parent.accommodationId);
    },
  },
};
