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

const confirmedTripNoteContentSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1).max(5000));

export const confirmedTripNoteCreateSchema = z.object({
  confirmedTripId: z.string().min(1),
  content: confirmedTripNoteContentSchema,
});

export const confirmedTripNoteUpdateSchema = z.object({
  content: confirmedTripNoteContentSchema,
});

export type ConfirmedTripNoteCreateInput = z.infer<typeof confirmedTripNoteCreateSchema>;
export type ConfirmedTripNoteUpdateInput = z.infer<typeof confirmedTripNoteUpdateSchema>;

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

export const confirmedTripKoreaTeamStageOptionCreateSchema = z.object({
  label: z.string().trim().min(1).max(50),
});

export const KOREA_TEAM_STAGE_COLOR_TONES = [
  'slate',
  'blue',
  'emerald',
  'amber',
  'rose',
  'violet',
  'cyan',
  'orange',
] as const;

export const confirmedTripKoreaTeamStageOptionColorToneSchema = z.enum(KOREA_TEAM_STAGE_COLOR_TONES);

export const confirmedTripKoreaTeamStageOptionUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(50).optional(),
    colorTone: confirmedTripKoreaTeamStageOptionColorToneSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.label === undefined && data.colorTone === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of label or colorTone is required',
        path: [],
      });
    }
  });

export const confirmedTripKoreaTeamStageOptionReorderItemSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int().min(0),
});

export const confirmedTripKoreaTeamStageOptionsReorderSchema = z
  .array(confirmedTripKoreaTeamStageOptionReorderItemSchema)
  .min(1)
  .superRefine((items, ctx) => {
    const ids = items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate option id in reorder input',
      });
    }
    const orders = items.map((item) => item.sortOrder);
    if (new Set(orders).size !== orders.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate sortOrder in reorder input',
      });
    }
  });

export const confirmedTripPostTripTaskOptionCreateSchema = z.object({
  label: z.string().trim().min(1).max(50),
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
    koreaTeamStageOptionIds: z.array(z.string().min(1)).optional(),
    postTripTaskOptionIds: z.array(z.string().min(1)).optional(),
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
    if (data.koreaTeamStageOptionIds) {
      const ids = data.koreaTeamStageOptionIds;
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'koreaTeamStageOptionIds contains duplicate optionId',
          path: ['koreaTeamStageOptionIds'],
        });
      }
    }
    if (data.postTripTaskOptionIds) {
      const ids = data.postTripTaskOptionIds;
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'postTripTaskOptionIds contains duplicate optionId',
          path: ['postTripTaskOptionIds'],
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
export type ConfirmedTripKoreaTeamStageOptionCreateInput = z.infer<typeof confirmedTripKoreaTeamStageOptionCreateSchema>;
export type ConfirmedTripKoreaTeamStageOptionUpdateInput = z.infer<typeof confirmedTripKoreaTeamStageOptionUpdateSchema>;
export type ConfirmedTripKoreaTeamStageOptionReorderInput = z.infer<typeof confirmedTripKoreaTeamStageOptionReorderItemSchema>;
export type ConfirmedTripPostTripTaskOptionCreateInput = z.infer<typeof confirmedTripPostTripTaskOptionCreateSchema>;
