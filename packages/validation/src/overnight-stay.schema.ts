import { z } from 'zod';

export const blockTypeSchema = z.enum(['STAY', 'TRANSFER']);
export type BlockType = z.infer<typeof blockTypeSchema>;

const overnightStayDayInputSchema = z.object({
  dayOrder: z.number().int().min(1).max(3),
  displayLocationId: z.string().min(1).optional(),
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
  blockType: blockTypeSchema.default('STAY'),
  startLocationId: z.string().min(1).optional(),
  endLocationId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  days: z.array(overnightStayDayInputSchema).min(2).max(3),
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
  const orderedDayOrders = value.days
    .map((day) => day.dayOrder)
    .slice()
    .sort((left, right) => left - right);

  if (new Set(orderedDayOrders).size !== orderedDayOrders.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'days must not contain duplicate dayOrder values',
      path: ['days'],
    });
    return;
  }

  const expectedDayOrders = Array.from({ length: orderedDayOrders.length }, (_, index) => index + 1);
  if (orderedDayOrders.some((dayOrder, index) => dayOrder !== expectedDayOrders[index])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'days must include consecutive dayOrder values starting from 1',
      path: ['days'],
    });
  }
});

export const overnightStayUpdateSchema = overnightStayBaseSchema.partial().superRefine((value, ctx) => {
  if (!value.days) {
    return;
  }

  const orderedDayOrders = value.days
    .map((day) => day.dayOrder)
    .slice()
    .sort((left, right) => left - right);

  if (new Set(orderedDayOrders).size !== orderedDayOrders.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'days must not contain duplicate dayOrder values',
      path: ['days'],
    });
    return;
  }

  const expectedDayOrders = Array.from({ length: orderedDayOrders.length }, (_, index) => index + 1);
  if (orderedDayOrders.some((dayOrder, index) => dayOrder !== expectedDayOrders[index])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'days must include consecutive dayOrder values starting from 1',
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
