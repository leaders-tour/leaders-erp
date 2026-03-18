import { z } from 'zod';

export const blockTypeSchema = z.enum(['STAY', 'TRANSFER']);
export type BlockType = z.infer<typeof blockTypeSchema>;

const multiDayBlockDayInputSchema = z.object({
  dayOrder: z.number().int().min(1).max(3),
  displayLocationId: z.string().min(1).optional(),
  averageDistanceKm: z.number().min(0),
  averageTravelHours: z.number().min(0),
  timeCellText: z.string(),
  scheduleCellText: z.string(),
  lodgingCellText: z.string(),
  mealCellText: z.string(),
});

const multiDayBlockBaseSchema = z.object({
  regionId: z.string().min(1),
  locationId: z.string().min(1),
  blockType: blockTypeSchema.default('STAY'),
  startLocationId: z.string().min(1).optional(),
  endLocationId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  days: z.array(multiDayBlockDayInputSchema).min(2).max(3),
});

const multiDayBlockConnectionTimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  activities: z.array(z.string().max(500)).max(20),
});

const multiDayBlockConnectionTimeSlotsSchema = z.array(multiDayBlockConnectionTimeSlotSchema).min(1).max(24);

const multiDayBlockConnectionVersionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: multiDayBlockConnectionTimeSlotsSchema,
  earlyTimeSlots: multiDayBlockConnectionTimeSlotsSchema.optional(),
  extendTimeSlots: multiDayBlockConnectionTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: multiDayBlockConnectionTimeSlotsSchema.optional(),
  isDefault: z.boolean().optional(),
});

const multiDayBlockConnectionBaseSchema = z.object({
  regionId: z.string().min(1),
  fromOvernightStayId: z.string().min(1),
  toLocationId: z.string().min(1),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
  isLongDistance: z.boolean(),
  timeSlots: multiDayBlockConnectionTimeSlotsSchema,
  earlyTimeSlots: multiDayBlockConnectionTimeSlotsSchema.optional(),
  extendTimeSlots: multiDayBlockConnectionTimeSlotsSchema.optional(),
  earlyExtendTimeSlots: multiDayBlockConnectionTimeSlotsSchema.optional(),
  versions: z.array(multiDayBlockConnectionVersionSchema).min(1).max(20).optional(),
});

export const multiDayBlockCreateSchema = multiDayBlockBaseSchema.superRefine((value, ctx) => {
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

export const multiDayBlockUpdateSchema = multiDayBlockBaseSchema.partial().superRefine((value, ctx) => {
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

export const multiDayBlockConnectionCreateSchema = multiDayBlockConnectionBaseSchema.superRefine((value, ctx) => {
  if (!value.versions) {
    return;
  }
  validateDefaultVersions(value.versions, ctx);
});

export const multiDayBlockConnectionUpdateSchema = multiDayBlockConnectionBaseSchema.partial().superRefine((value, ctx) => {
  if (!value.versions) {
    return;
  }
  validateDefaultVersions(value.versions, ctx);
});

export type MultiDayBlockCreateInput = z.infer<typeof multiDayBlockCreateSchema>;
export type MultiDayBlockUpdateInput = z.infer<typeof multiDayBlockUpdateSchema>;
export type MultiDayBlockDayInput = z.infer<typeof multiDayBlockDayInputSchema>;
export type MultiDayBlockConnectionCreateInput = z.infer<typeof multiDayBlockConnectionCreateSchema>;
export type MultiDayBlockConnectionUpdateInput = z.infer<typeof multiDayBlockConnectionUpdateSchema>;
export type MultiDayBlockConnectionTimeSlotInput = z.infer<typeof multiDayBlockConnectionTimeSlotSchema>;
export type MultiDayBlockConnectionVersionInput = z.infer<typeof multiDayBlockConnectionVersionSchema>;
