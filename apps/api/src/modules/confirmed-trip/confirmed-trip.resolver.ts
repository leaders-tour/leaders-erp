import type { ConfirmedTripStatus } from '@prisma/client';
import type { AppContext } from '../../context';
import { ConfirmedTripService } from './confirmed-trip.service';
import type { ConfirmTripDto, ConfirmedTripLodgingUpsertDto, ConfirmedTripUpdateDto } from './confirmed-trip.types';

interface ConfirmedTripsArgs {
  status?: ConfirmedTripStatus;
}

interface IdArgs {
  id: string;
}

interface ConfirmTripArgs {
  input: ConfirmTripDto;
}

interface UpdateConfirmedTripArgs {
  id: string;
  input: ConfirmedTripUpdateDto;
}

interface UpsertLodgingArgs {
  input: ConfirmedTripLodgingUpsertDto;
}

interface SeedLodgingsArgs {
  confirmedTripId: string;
}

export const confirmedTripResolver = {
  Query: {
    confirmedTrips: (_parent: unknown, args: ConfirmedTripsArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).list(args.status),
    confirmedTrip: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).get(args.id),
  },
  Mutation: {
    confirmTrip: (_parent: unknown, args: ConfirmTripArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).confirm(args.input),
    updateConfirmedTrip: (_parent: unknown, args: UpdateConfirmedTripArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).update(args.id, args.input),
    cancelConfirmedTrip: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).cancel(args.id),
    upsertConfirmedTripLodging: (_parent: unknown, args: UpsertLodgingArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).upsertLodging(args.input),
    deleteConfirmedTripLodging: (_parent: unknown, args: IdArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).deleteLodging(args.id),
    seedConfirmedTripLodgingsFromPlan: (_parent: unknown, args: SeedLodgingsArgs, ctx: AppContext) =>
      new ConfirmedTripService(ctx.prisma).seedLodgingsFromPlan(args.confirmedTripId),
  },
  ConfirmedTrip: {
    lodgings: async (parent: { id: string; lodgings?: unknown[] }, _args: unknown, ctx: AppContext) => {
      if (Array.isArray(parent.lodgings)) {
        return new ConfirmedTripService(ctx.prisma).getLodgingsWithConflicts(parent.id);
      }
      return [];
    },
  },
  ConfirmedTripLodging: {
    conflictWarnings: (parent: { conflictWarnings?: unknown[] }) =>
      Array.isArray(parent.conflictWarnings) ? parent.conflictWarnings : [],
  },
};
