import { z } from 'zod';

/** LLM이 추출한 상담 폼 응답. 변수 많은 고객 입력을 구조화된 JSON으로 변환. */
export const consultationExtractionSchema = z.object({
  contact: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
  headcount: z.object({
    total: z.number().int().min(1).max(30).nullable(),
    male: z.number().int().min(0).nullable(),
    female: z.number().int().min(0).nullable(),
    rawText: z.string().optional(),
  }),
  destinationPreference: z.object({
    rawText: z.string(),
    normalizedKeyword: z.string().nullable().optional(),
  }),
  tourDates: z.object({
    rawText: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  }),
  flightOrBorder: z.object({
    rawText: z.string(),
    inbound: z
      .object({
        date: z.string().nullable(),
        time: z.string().nullable(),
      })
      .optional(),
    outbound: z
      .object({
        date: z.string().nullable(),
        time: z.string().nullable(),
      })
      .optional(),
  }),
  movementIntensity: z.object({
    level1to5: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
    rawLabel: z.string().nullable(),
  }),
  lodgingPreference: z.object({
    rawText: z.string(),
    suggestedLevel: z.enum(['LV1', 'LV2', 'LV3', 'LV4']).nullable().optional(),
  }),
  vehicle: z.object({
    wantsVehicle: z.boolean().nullable().optional(),
    mentionedTypes: z.array(z.string()).optional(),
  }),
  specialRequests: z.string().nullable(),
});

export type ConsultationExtraction = z.infer<typeof consultationExtractionSchema>;
