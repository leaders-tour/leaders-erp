import { ConfirmedTripStatus } from '@tour/domain';
import { z } from 'zod';

export const calendarNoteKindSchema = z.enum([
  'GUEST_HOUSE',
  'PICKUP',
  'DROP',
  'CAMEL_DOLL',
  'CUSTOM',
  'NOMADIC_SHOW',
]);

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const calendarNoteTimeTextOptionalForCreate = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return v;
  },
  z.string().regex(HH_MM_REGEX, 'timeText must be HH:mm').optional(),
);

const calendarNoteTimeTextOptionalForUpdate = z.preprocess(
  (v) => {
    if (v === null) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    return v;
  },
  z.union([z.null(), z.string().regex(HH_MM_REGEX, 'timeText must be HH:mm')]).optional(),
);

export const calendarNoteCreateSchema = z.object({
  occursOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'occursOn must be YYYY-MM-DD'),
  kind: calendarNoteKindSchema,
  customText: z.string().max(500).nullable().optional(),
  timeText: calendarNoteTimeTextOptionalForCreate,
  headcount: z.number().int().min(1).max(9999).nullable().optional(),
  confirmedTripId: z.string().min(1).nullable().optional(),
  memo: z.string().max(5000).nullable().optional(),
});

export const calendarNoteUpdateSchema = z.object({
  occursOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: calendarNoteKindSchema.optional(),
  customText: z.string().max(500).nullable().optional(),
  timeText: calendarNoteTimeTextOptionalForUpdate,
  headcount: z.number().int().min(1).max(9999).nullable().optional(),
  confirmedTripId: z.string().min(1).nullable().optional(),
  memo: z.string().max(5000).nullable().optional(),
});

export type CalendarNoteKind = z.infer<typeof calendarNoteKindSchema>;
export type CalendarNoteCreateInput = z.infer<typeof calendarNoteCreateSchema>;
export type CalendarNoteUpdateInput = z.infer<typeof calendarNoteUpdateSchema>;

export const confirmedTripStatusSchema = z.nativeEnum(ConfirmedTripStatus);

export const confirmedTripGuideAssignmentInputSchema = z.object({
  guideId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
  nameSnapshot: z.string().max(200).nullable().optional(),
});

export const confirmedTripDriverAssignmentInputSchema = z.object({
  driverId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
  nameSnapshot: z.string().max(200).nullable().optional(),
});

export const confirmTripSchema = z.object({
  planId: z.string().min(1),
  planVersionId: z.string().min(1),
  confirmedByEmployeeId: z.string().min(1).optional(),
});

export const confirmedTripUpdateSchema = z
  .object({
    planVersionId: z.string().min(1).optional(),
    confirmedAt: z.coerce.date().optional(),
    assignedVehicle: z.string().max(200).nullable().optional(),
    accommodationNote: z.string().max(5000).nullable().optional(),
    operationNote: z.string().max(5000).nullable().optional(),
    openChatUrl: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
      z.string().url().max(2048).nullable().optional(),
    ),
    status: confirmedTripStatusSchema.optional(),
    travelStart: z.coerce.date().nullable().optional(),
    travelEnd: z.coerce.date().nullable().optional(),
    pickupDate: z.coerce.date().nullable().optional(),
    dropDate: z.coerce.date().nullable().optional(),
    destination: z.string().max(500).nullable().optional(),
    paxCount: z.number().int().min(1).max(9999).nullable().optional(),
    guideAssignments: z.array(confirmedTripGuideAssignmentInputSchema).optional(),
    driverAssignments: z.array(confirmedTripDriverAssignmentInputSchema).optional(),
  rentalGear: z.boolean().optional(),
  rentalDrone: z.boolean().optional(),
  rentalStarlink: z.boolean().optional(),
  rentalPowerbank: z.boolean().optional(),
  camelDollPurchased: z.boolean().optional(),
  isRecruitingOpen: z.boolean().optional(),
  depositAmountKrw: z.number().int().min(0).nullable().optional(),
  balanceAmountKrw: z.number().int().min(0).nullable().optional(),
  totalAmountKrw: z.number().int().min(0).nullable().optional(),
  securityDepositAmountKrw: z.number().int().min(0).nullable().optional(),
    groupTotalAmountKrw: z.number().int().min(0).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.guideAssignments) {
      const ids = data.guideAssignments.map((a) => a.guideId);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'guideAssignments contains duplicate guideId',
          path: ['guideAssignments'],
        });
      }
    }
    if (data.driverAssignments) {
      const ids = data.driverAssignments.map((a) => a.driverId);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'driverAssignments contains duplicate driverId',
          path: ['driverAssignments'],
        });
      }
    }
  });

export const createConfirmedTripDirectSchema = z.object({
  userId: z.string().min(1),
  travelStart: z.coerce.date().nullable().optional(),
  travelEnd: z.coerce.date().nullable().optional(),
  destination: z.string().max(500).nullable().optional(),
  paxCount: z.number().int().min(1).max(9999).nullable().optional(),
  totalAmountKrw: z.number().int().min(0).nullable().optional(),
  depositAmountKrw: z.number().int().min(0).nullable().optional(),
  balanceAmountKrw: z.number().int().min(0).nullable().optional(),
  securityDepositAmountKrw: z.number().int().min(0).nullable().optional(),
  confirmedByEmployeeId: z.string().nullable().optional(),
});

export type ConfirmTripInput = z.infer<typeof confirmTripSchema>;
export type CreateConfirmedTripDirectInput = z.infer<typeof createConfirmedTripDirectSchema>;
export type ConfirmedTripUpdateInput = z.infer<typeof confirmedTripUpdateSchema>;
export type ConfirmedTripGuideAssignmentInput = z.infer<typeof confirmedTripGuideAssignmentInputSchema>;
export type ConfirmedTripDriverAssignmentInput = z.infer<typeof confirmedTripDriverAssignmentInputSchema>;
