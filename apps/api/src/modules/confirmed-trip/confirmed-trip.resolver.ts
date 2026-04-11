import type { ConfirmedTripStatus } from '@prisma/client';
import type { AppContext } from '../../context';
import { ConfirmedTripService } from './confirmed-trip.service';
import type { ConfirmTripDto, ConfirmedTripUpdateDto } from './confirmed-trip.types';

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
  },
};
