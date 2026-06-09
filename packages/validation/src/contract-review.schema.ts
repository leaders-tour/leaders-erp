import { z } from 'zod';

export const matchContractDocumentInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
  planVersionId: z.string().trim().min(1, '견적 버전 ID는 필수입니다.'),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const unmatchContractDocumentInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
});

export type MatchContractDocumentInput = z.infer<typeof matchContractDocumentInputSchema>;
export type UnmatchContractDocumentInput = z.infer<typeof unmatchContractDocumentInputSchema>;
