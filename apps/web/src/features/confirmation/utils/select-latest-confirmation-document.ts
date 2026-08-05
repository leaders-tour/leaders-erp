import type { ConfirmationDocumentRow } from '../model/types';

export function selectLatestConfirmationDocument(
  documents: readonly ConfirmationDocumentRow[],
): ConfirmationDocumentRow | null {
  if (documents.length === 0) {
    return null;
  }

  return [...documents].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export function resolvePreviewConfirmationDocument(
  documents: readonly ConfirmationDocumentRow[],
  previewDocumentId?: string | null,
): ConfirmationDocumentRow | null {
  if (documents.length === 0) {
    return null;
  }

  const trimmedId = previewDocumentId?.trim();
  if (trimmedId) {
    const selected = documents.find((document) => document.id === trimmedId);
    if (selected) {
      return selected;
    }
  }

  return selectLatestConfirmationDocument(documents);
}

export function resolveConfirmationPreviewPlanVersionId(
  document:
    | Pick<ConfirmationDocumentRow, 'planVersionId' | 'snapshot'>
    | null
    | undefined,
  fallbackPlanVersionId?: string | null,
): string | null {
  if (!document) {
    return fallbackPlanVersionId ?? null;
  }

  return (
    document.planVersionId ??
    document.snapshot.sourcePlanVersionId ??
    fallbackPlanVersionId ??
    null
  );
}
