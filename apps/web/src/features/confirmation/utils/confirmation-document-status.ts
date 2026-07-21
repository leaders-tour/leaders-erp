import type { ConfirmationDocumentRow } from '../model/types';

export function getConfirmationDocumentStatusLabel(
  status: ConfirmationDocumentRow['status'],
): string {
  switch (status) {
    case 'DRAFT':
      return '임시저장';
    case 'PUBLISHED':
      return '발행';
    case 'ARCHIVED':
      return '보관됨';
    default:
      return status;
  }
}
