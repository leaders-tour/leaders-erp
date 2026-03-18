import { z } from 'zod';

const overnightStayDayInputSchema = z.object({
  dayOrder: z.union([z.literal(1), z.literal(2)]),
  averageDistanceKm: z.number().min(0),
  averageTravelHours: z.number().min(0),
  timeCellText: z.string(),
  scheduleCellText: z.string(),
  lodgingCellText: z.string(),
  mealCellText: z.string(),
});

const overnightStayBaseSchema = z.object({
  regionId: z.string().min(1),
  locationId: z.string().min(1),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  days: z.array(overnightStayDayInputSchema).length(2),
});

const overnightStayConnectionTimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  activities: z.array(z.string().max(500)).max(20),
});

const overnightStayConnectionTimeSlotsSchema = z.array(overnightStayConnectionTimeSlotSchema).min(1).max(24);

const overnightStayConnectionVersionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: overnightStayConnectionTimeSlotsSchema,
  earlyTimeSlots: overnightStayConnectionTimeSlotsSchema.optional(),
  extendTimeSlots: overnightStayConnectionTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: overnightStayConnectionTimeSlotsSchema.optional(),
  isDefault: z.boolean().optional(),
});

const overnightStayConnectionBaseSchema = z.object({
  regionId: z.string().min(1),
  fromOvernightStayId: z.string().min(1),
  toLocationId: z.string().min(1),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: overnightStayConnectionTimeSlotsSchema,
  earlyTimeSlots: overnightStayConnectionTimeSlotsSchema.optional(),
  extendTimeSlots: overnightStayConnectionTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: overnightStayConnectionTimeSlotsSchema.optional(),
  versions: z.array(overnightStayConnectionVersionSchema).min(1).max(20).optional(),
});

export const overnightStayCreateSchema = overnightStayBaseSchema.superRefine((value, ctx) => {
  const dayOrders = new Set(value.days.map((day) => day.dayOrder));
  if (!dayOrders.has(1) || !dayOrders.has(2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'days must include exactly dayOrder 1 and 2',
      path: ['days'],
    });
  }
});

export const overnightStayUpdateSchema = overnightStayBaseSchema.partial().superRefine((value, ctx) => {
  if (!value.days) {
    return;
  }

  const dayOrders = new Set(value.days.map((day) => day.dayOrder));
  if (!dayOrders.has(1) || !dayOrders.has(2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'days must include exactly dayOrder 1 and 2',
      path: ['days'],
    });
  }
});

function validateDefaultVersions(
  versions: Array<{ isDefault?: boolean }>,
  ctx: z.RefinementCtx,
): void {
  const defaultVersions = versions.filter((version) => version.isDefault !== false);
  if (defaultVersions.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'versions must include exactly one default version',
      path: ['versions'],
    });
  }
}

export const overnightStayConnectionCreateSchema = overnightStayConnectionBaseSchema.superRefine((value, ctx) => {
  if (!value.versions) {
    return;
  }
  validateDefaultVersions(value.versions, ctx);
});

export const overnightStayConnectionUpdateSchema = overnightStayConnectionBaseSchema.partial().superRefine((value, ctx) => {
  if (!value.versions) {
    return;
  }
  validateDefaultVersions(value.versions, ctx);
});

export type OvernightStayCreateInput = z.infer<typeof overnightStayCreateSchema>;
export type OvernightStayUpdateInput = z.infer<typeof overnightStayUpdateSchema>;
export type OvernightStayDayInput = z.infer<typeof overnightStayDayInputSchema>;
export type OvernightStayConnectionCreateInput = z.infer<typeof overnightStayConnectionCreateSchema>;
export type OvernightStayConnectionUpdateInput = z.infer<typeof overnightStayConnectionUpdateSchema>;
export type OvernightStayConnectionTimeSlotInput = z.infer<typeof overnightStayConnectionTimeSlotSchema>;
export type OvernightStayConnectionVersionInput = z.infer<typeof overnightStayConnectionVersionSchema>;
