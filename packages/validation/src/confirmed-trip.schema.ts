import { ConfirmedTripStatus } from '@tour/domain';
import { z } from 'zod';

export const calendarNoteKindSchema = z.enum([
  'GUEST_HOUSE',
  'PICKUP',
  'DROP',
  'CAMEL_DOLL',
  'CUSTOM',
]);

export const calendarNoteCreateSchema = z.object({
  occursOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'occursOn must be YYYY-MM-DD'),
  kind: calendarNoteKindSchema,
  customText: z.string().max(500).nullable().optional(),
  confirmedTripId: z.string().min(1).nullable().optional(),
  memo: z.string().max(5000).nullable().optional(),
});

export const calendarNoteUpdateSchema = z.object({
  occursOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: calendarNoteKindSchema.optional(),
  customText: z.string().max(500).nullable().optional(),
  confirmedTripId: z.string().min(1).nullable().optional(),
  memo: z.string().max(5000).nullable().optional(),
});

export type CalendarNoteKind = z.infer<typeof calendarNoteKindSchema>;
export type CalendarNoteCreateInput = z.infer<typeof calendarNoteCreateSchema>;
export type CalendarNoteUpdateInput = z.infer<typeof calendarNoteUpdateSchema>;

export const confirmedTripStatusSchema = z.nativeEnum(ConfirmedTripStatus);

export const confirmTripSchema = z.object({
  planId: z.string().min(1),
  planVersionId: z.string().min(1),
  confirmedByEmployeeId: z.string().min(1).optional(),
});

export const confirmedTripUpdateSchema = z.object({
  guideName: z.string().max(200).nullable().optional(),
  driverName: z.string().max(200).nullable().optional(),
  assignedVehicle: z.string().max(200).nullable().optional(),
  accommodationNote: z.string().max(5000).nullable().optional(),
  operationNote: z.string().max(5000).nullable().optional(),
  status: confirmedTripStatusSchema.optional(),
  travelStart: z.coerce.date().nullable().optional(),
  travelEnd: z.coerce.date().nullable().optional(),
  pickupDate: z.coerce.date().nullable().optional(),
  dropDate: z.coerce.date().nullable().optional(),
  destination: z.string().max(500).nullable().optional(),
  paxCount: z.number().int().min(1).max(9999).nullable().optional(),
  guideId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  rentalGear: z.boolean().optional(),
  rentalDrone: z.boolean().optional(),
  rentalStarlink: z.boolean().optional(),
  rentalPowerbank: z.boolean().optional(),
  camelDollPurchased: z.boolean().optional(),
  depositAmountKrw: z.number().int().min(0).nullable().optional(),
  balanceAmountKrw: z.number().int().min(0).nullable().optional(),
  totalAmountKrw: z.number().int().min(0).nullable().optional(),
  securityDepositAmountKrw: z.number().int().min(0).nullable().optional(),
  groupTotalAmountKrw: z.number().int().min(0).nullable().optional(),
});

export type ConfirmTripInput = z.infer<typeof confirmTripSchema>;
export type ConfirmedTripUpdateInput = z.infer<typeof confirmedTripUpdateSchema>;
