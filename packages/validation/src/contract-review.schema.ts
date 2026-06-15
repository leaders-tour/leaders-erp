import { z } from 'zod';

export const matchContractDocumentInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
  planVersionId: z.string().trim().min(1, '견적 버전 ID는 필수입니다.'),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const unmatchContractDocumentInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
});

export const excludeContractSubmissionFromCountInputSchema = z.object({
  submissionId: z.string().trim().min(1, '작성 행 ID는 필수입니다.'),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const restoreContractSubmissionToCountInputSchema = z.object({
  submissionId: z.string().trim().min(1, '작성 행 ID는 필수입니다.'),
});

export const trashContractDocumentReviewInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const restoreContractDocumentReviewInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
});

export const matchContractPaymentReceiptInputSchema = z.object({
  receiptId: z.string().trim().min(1, '입금 row ID는 필수입니다.'),
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
});

export const unmatchContractPaymentReceiptInputSchema = z.object({
  receiptId: z.string().trim().min(1, '입금 row ID는 필수입니다.'),
});

export const createManualContractPaymentReceiptInputSchema = z.object({
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.'),
  payerName: z.string().trim().max(200).optional().nullable(),
  amountKrw: z.number().int().refine((value) => value !== 0, '금액은 0원일 수 없습니다.'),
  receivedAt: z.coerce.date().optional().nullable(),
  memo: z.string().trim().max(2000).optional().nullable(),
});

export const updateManualContractPaymentReceiptInputSchema = z.object({
  receiptId: z.string().trim().min(1, '입금 row ID는 필수입니다.'),
  documentNumber: z.string().trim().min(1, '문서번호는 필수입니다.').optional(),
  payerName: z.string().trim().max(200).optional().nullable(),
  amountKrw: z.number().int().refine((value) => value !== 0, '금액은 0원일 수 없습니다.').optional(),
  receivedAt: z.coerce.date().optional().nullable(),
  memo: z.string().trim().max(2000).optional().nullable(),
});

export const deleteManualContractPaymentReceiptInputSchema = z.object({
  receiptId: z.string().trim().min(1, '입금 row ID는 필수입니다.'),
});

export type MatchContractDocumentInput = z.infer<typeof matchContractDocumentInputSchema>;
export type UnmatchContractDocumentInput = z.infer<typeof unmatchContractDocumentInputSchema>;
export type ExcludeContractSubmissionFromCountInput = z.infer<typeof excludeContractSubmissionFromCountInputSchema>;
export type RestoreContractSubmissionToCountInput = z.infer<typeof restoreContractSubmissionToCountInputSchema>;
export type TrashContractDocumentReviewInput = z.infer<typeof trashContractDocumentReviewInputSchema>;
export type RestoreContractDocumentReviewInput = z.infer<typeof restoreContractDocumentReviewInputSchema>;
export type MatchContractPaymentReceiptInput = z.infer<typeof matchContractPaymentReceiptInputSchema>;
export type UnmatchContractPaymentReceiptInput = z.infer<typeof unmatchContractPaymentReceiptInputSchema>;
export type CreateManualContractPaymentReceiptInput = z.infer<typeof createManualContractPaymentReceiptInputSchema>;
export type UpdateManualContractPaymentReceiptInput = z.infer<typeof updateManualContractPaymentReceiptInputSchema>;
export type DeleteManualContractPaymentReceiptInput = z.infer<typeof deleteManualContractPaymentReceiptInputSchema>;
