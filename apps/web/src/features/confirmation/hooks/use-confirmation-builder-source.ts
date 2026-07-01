import { useMemo } from 'react';
import {
  useConfirmationDocument,
  useConfirmationDraftDefaults,
  useLatestConfirmationDocument,
  useLatestPublishedConfirmationDocument,
} from '../hooks/use-confirmation-document';
import type { ConfirmationBuilderState } from '../model/types';
import type { ConfirmationBuilderSource } from '../utils/confirmation-builder-source';
import { snapshotToDocumentData } from '../utils/format';

export function useConfirmationBuilderSource(
  confirmedTripId: string | undefined,
  source: ConfirmationBuilderSource | null,
  fromDocumentId?: string | null,
) {
  const latest = useLatestConfirmationDocument(confirmedTripId);
  const published = useLatestPublishedConfirmationDocument(confirmedTripId);
  const specific = useConfirmationDocument(fromDocumentId ?? undefined);
  const effectiveSource: ConfirmationBuilderSource =
    source ?? (latest.document?.status === 'DRAFT' ? 'draft' : 'fresh');

  const defaults = useConfirmationDraftDefaults(
    confirmedTripId && effectiveSource === 'fresh' ? confirmedTripId : undefined,
  );

  const initialState = useMemo<ConfirmationBuilderState | null>(() => {
    if ((effectiveSource === 'version' || (effectiveSource === 'draft' && fromDocumentId)) && specific.document) {
      return specific.document.snapshot;
    }
    if (effectiveSource === 'draft' && latest.document?.status === 'DRAFT') {
      return latest.document.snapshot;
    }
    if (effectiveSource === 'published' && published.document) {
      return published.document.snapshot;
    }
    if (effectiveSource === 'fresh') {
      return defaults.defaults?.snapshot ?? null;
    }
    return null;
  }, [
    defaults.defaults?.snapshot,
    effectiveSource,
    fromDocumentId,
    latest.document,
    published.document,
    specific.document,
  ]);

  const previewData = useMemo(
    () => (initialState ? snapshotToDocumentData(initialState, { consolidateAccommodationLines: true }) : null),
    [initialState],
  );

  return {
    initialState,
    previewData,
    effectiveSource,
    latestDocument: latest.document,
    publishedDocument: published.document,
    loading: latest.loading || published.loading || specific.loading || defaults.loading,
    error: latest.error ?? published.error ?? specific.error ?? defaults.error,
    refetch: async () => {
      await Promise.all([latest.refetch(), published.refetch(), specific.refetch(), defaults.refetch()]);
    },
  };
}

export function useConfirmationPreviewData(confirmedTripId: string | undefined) {
  const { document, loading } = useLatestPublishedConfirmationDocument(confirmedTripId);
  const previewData = useMemo(
    () => (document ? snapshotToDocumentData(document.snapshot) : null),
    [document],
  );

  return {
    document,
    previewData,
    loading,
    hasPublishedConfirmation: !!document,
  };
}
