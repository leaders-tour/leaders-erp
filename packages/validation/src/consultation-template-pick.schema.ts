import { z } from 'zod';

const templatePickObjectSchema = z.object({
  /** Prisma uuid(7) 등 — 엄격한 UUID v4 제한 없음 */
  chosenId: z.string().min(1).nullable(),
  reason: z.string().max(600).nullable().optional(),
});

/**
 * LLM이 반환한 템플릿 선택 JSON을 검증한다.
 * 후보에 없는 id는 null로 정규화해 환각을 차단한다.
 */
export function parseConsultationTemplatePick(
  data: unknown,
  allowedIds: ReadonlySet<string>,
): { chosenId: string | null; reason: string | null } {
  const parsed = templatePickObjectSchema.parse(data);
  const reasonTrimmed = (parsed.reason ?? '').trim() || null;
  if (parsed.chosenId !== null && !allowedIds.has(parsed.chosenId)) {
    return { chosenId: null, reason: null };
  }
  if (parsed.chosenId === null) {
    return { chosenId: null, reason: null };
  }
  return { chosenId: parsed.chosenId, reason: reasonTrimmed };
}
