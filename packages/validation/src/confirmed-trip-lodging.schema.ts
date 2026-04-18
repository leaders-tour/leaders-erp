import { z } from 'zod';

export const lodgingAssignmentTypeSchema = z.enum([
  'ACCOMMODATION',
  'LV1',
  'LV2',
  'LV3',
  'LV4',
  'NIGHT_TRAIN',
  'CUSTOM_TEXT',
]);

export const lodgingBookingStatusSchema = z.enum(['PENDING', 'REQUESTED', 'CONFIRMED', 'CANCELLED']);

export const confirmedTripLodgingUpsertSchema = z
  .object({
    id: z.string().optional(),
    confirmedTripId: z.string().min(1),
    dayIndex: z.number().int().min(1),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    type: lodgingAssignmentTypeSchema,
    accommodationId: z.string().nullable().optional(),
    accommodationOptionId: z.string().nullable().optional(),
    lodgingNameSnapshot: z.string().min(1).max(500),
    pricePerNightKrw: z.number().int().min(0).nullable().optional(),
    roomCount: z.number().int().min(1).max(999),
    bookingStatus: lodgingBookingStatusSchema.optional().default('PENDING'),
    bookingMemo: z.string().max(2000).nullable().optional(),
    bookingReference: z.string().max(200).nullable().optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: 'checkOutDate must be after checkInDate',
    path: ['checkOutDate'],
  })
  .refine((data) => data.type !== 'ACCOMMODATION' || !!data.accommodationId, {
    message: 'accommodationId is required when type is ACCOMMODATION',
    path: ['accommodationId'],
  });

export type ConfirmedTripLodgingUpsertInput = z.infer<typeof confirmedTripLodgingUpsertSchema>;
