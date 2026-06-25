import { useMemo } from 'react';
import { useLatestConfirmationDocument, useConfirmationDraftDefaults } from '../hooks/use-confirmation-document';
import type { ConfirmationBuilderState } from '../model/types';
import { snapshotToDocumentData } from '../utils/format';

export function useConfirmationBuilderSource(confirmedTripId: string | undefined) {
  const latest = useLatestConfirmationDocument(confirmedTripId);
  const defaults = useConfirmationDraftDefaults(
    confirmedTripId && !latest.loading && latest.document?.status === 'DRAFT' ? undefined : confirmedTripId,
  );

  const initialState = useMemo<ConfirmationBuilderState | null>(() => {
    if (latest.document?.status === 'DRAFT') {
      return latest.document.snapshot;
    }
    return defaults.defaults?.snapshot ?? null;
  }, [defaults.defaults?.snapshot, latest.document]);

  const previewData = useMemo(
    () => (initialState ? snapshotToDocumentData(initialState, { consolidateAccommodationLines: true }) : null),
    [initialState],
  );

  return {
    initialState,
    previewData,
    latestDocument: latest.document,
    loading: latest.loading || defaults.loading,
    error: latest.error ?? defaults.error,
    refetch: async () => {
      await Promise.all([latest.refetch(), defaults.refetch()]);
    },
  };
}

export function useConfirmationPreviewData(confirmedTripId: string | undefined) {
  const { document, loading } = useLatestConfirmationDocument(confirmedTripId);
  const published = document?.status === 'PUBLISHED' ? document : null;
  const previewData = useMemo(
    () => (published ? snapshotToDocumentData(published.snapshot) : null),
    [published],
  );

  return {
    document: published,
    previewData,
    loading,
    hasPublishedConfirmation: !!published,
  };
}
