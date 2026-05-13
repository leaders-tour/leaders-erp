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

export const confirmedTripLodgingOptionUpsertSchema = z.object({
  accommodationOptionId: z.string().min(1),
  roomCount: z.number().int().min(1).max(999),
});

export const confirmedTripLodgingUpsertSchema = z
  .object({
    id: z.string().optional(),
    confirmedTripId: z.string().min(1),
    dayIndex: z.number().int().min(1),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    type: lodgingAssignmentTypeSchema,
    accommodationId: z.string().nullable().optional(),
    /** ACCOMMODATION 타입만 사용. 다른 타입은 빈 배열이어야 함. */
    optionAssignments: z
      .array(confirmedTripLodgingOptionUpsertSchema)
      .nullish()
      .transform((v) => v ?? []),
    lodgingNameSnapshot: z.string().min(1).max(500),
    pricePerNightKrw: z.number().int().min(0).nullable().optional(),
    /** ACCOMMODATION이 아니면 필수와 동등(기본값 1). ACCOMMODATION에서는 무시된다. */
    roomCount: z.number().int().min(1).max(999).optional(),
    bookingStatus: lodgingBookingStatusSchema.optional().default('PENDING'),
    bookingMemo: z.string().max(2000).nullable().optional(),
    bookingReference: z.string().max(200).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.checkOutDate <= data.checkInDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'checkOutDate must be after checkInDate',
        path: ['checkOutDate'],
      });
    }

    const optAssignments = data.optionAssignments ?? [];

    const optionIds = optAssignments.map((o) => o.accommodationOptionId);
    if (new Set(optionIds).size !== optionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'optionAssignments에 중복된 accommodationOptionId가 있습니다',
        path: ['optionAssignments'],
      });
    }

    if (data.type === 'ACCOMMODATION') {
      if (!data.accommodationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'accommodationId is required when type is ACCOMMODATION',
          path: ['accommodationId'],
        });
      }
      if (optAssignments.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ACCOMMODATION에서는 객실 옵션(optionAssignments)이 1개 이상 필요합니다',
          path: ['optionAssignments'],
        });
      }
      return;
    }

    if (optAssignments.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'optionAssignments는 ACCOMMODATION 타입에서만 허용됩니다',
        path: ['optionAssignments'],
      });
    }

    if (data.roomCount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roomCount is required when type is not ACCOMMODATION',
        path: ['roomCount'],
      });
    }
  });

export type ConfirmedTripLodgingOptionUpsertInput = z.infer<typeof confirmedTripLodgingOptionUpsertSchema>;

export type ConfirmedTripLodgingUpsertInput = z.infer<typeof confirmedTripLodgingUpsertSchema>;
