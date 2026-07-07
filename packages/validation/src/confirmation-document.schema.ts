import { z } from 'zod';

export const confirmationDocumentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const confirmationTravelerSchema = z.object({
  name: z.string().trim().min(1),
  gender: z.string().trim().nullable().optional(),
  birthCode: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export const confirmationAppendixPlanStopRowSchema = z.object({
  dateCellText: z.string(),
  destinationCellText: z.string(),
  timeCellText: z.string(),
  scheduleCellText: z.string(),
  lodgingCellText: z.string(),
  mealCellText: z.string(),
  movementIntensityColorOverride: z.string().nullable().optional(),
});

/** GraphQL nullable list and legacy JSON snapshots may store null; normalize to absent field. */
const optionalAppendixPlanStopsSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(confirmationAppendixPlanStopRowSchema).optional(),
);

export const confirmationDocumentSnapshotSchema = z.object({
  leaderName: z.string().trim().min(1),
  documentNumber: z.string().trim().nullable().optional(),
  destination: z.string().trim().min(1),
  headcountText: z.string().trim().min(1),
  travelPeriodText: z.string().trim().min(1),
  vehicleType: z.string().trim().min(1),
  flightInText: z.string().trim().min(1),
  flightOutText: z.string().trim().min(1),
  pickupText: z.string().trim().min(1),
  dropText: z.string().trim().min(1),
  externalPickupDropText: z.string().trim(),
  specialNote: z.string().trim(),
  rentalItemsText: z.string().trim(),
  eventNames: z.string().trim(),
  remark: z.string().trim(),
  balancePerPersonText: z.string().trim().min(1),
  guideName: z.string().trim(),
  meetingPlace: z.string().trim().min(1),
  travelers: z.array(confirmationTravelerSchema),
  accommodationLines: z.array(z.string().trim().min(1)),
  appendixPlanStops: optionalAppendixPlanStopsSchema,
  sourcePlanVersionId: z.string().trim().min(1).nullable().optional(),
  overallMovementIntensityColorOverride: z.string().nullable().optional(),
});

export const saveConfirmationDocumentSchema = z.object({
  confirmedTripId: z.string().min(1),
  snapshot: confirmationDocumentSnapshotSchema,
  publish: z.boolean().optional().default(false),
});

export type ConfirmationDocumentStatus = z.infer<typeof confirmationDocumentStatusSchema>;
export type ConfirmationTravelerInput = z.infer<typeof confirmationTravelerSchema>;
export type ConfirmationAppendixPlanStopRowInput = z.infer<typeof confirmationAppendixPlanStopRowSchema>;
export type ConfirmationDocumentSnapshotInput = z.infer<typeof confirmationDocumentSnapshotSchema>;
export type SaveConfirmationDocumentInput = z.infer<typeof saveConfirmationDocumentSchema>;
