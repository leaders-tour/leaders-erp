import { useEffect, useMemo, useState } from 'react';
import { usePlanVersionDetail } from '../../plan/hooks';
import { fromBuilderDraft, fromVersion } from '../adapters';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData, EstimateSourceMode } from '../model/types';
import { useEstimateLocationGuides } from './use-estimate-location-guides';
import { applyLocationGuides } from '../utils/apply-location-guides';
import { readEstimateDraftSnapshotFromSessionStorage } from '../utils/draft-snapshot';

interface EstimateSourceParams {
  mode: EstimateSourceMode;
  versionId: string | null;
  draftKey: string | null;
}

interface EstimateSourceResult {
  data: EstimateDocumentData | null;
  loading: boolean;
  errorMessage: string | null;
}

export function useEstimateSource({ mode, versionId, draftKey }: EstimateSourceParams): EstimateSourceResult {
  const { version, loading: versionLoading } = usePlanVersionDetail(mode === 'version' ? versionId ?? undefined : undefined);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides();
  const [draftSnapshot, setDraftSnapshot] = useState<EstimateBuilderDraftSnapshot | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'draft') {
      setDraftSnapshot(null);
      setDraftError(null);
      return;
    }

    if (!draftKey) {
      const result = readEstimateDraftSnapshotFromSessionStorage(draftKey);
      setDraftSnapshot(result.snapshot);
      setDraftError(result.errorMessage);
      return;
    }

    const result = readEstimateDraftSnapshotFromSessionStorage(draftKey);
    setDraftSnapshot(result.snapshot);
    setDraftError(result.errorMessage);
  }, [draftKey, mode]);

  const baseData = useMemo<EstimateDocumentData | null>(() => {
    if (mode === 'version') {
      if (!version) {
        return null;
      }
      return fromVersion(version);
    }

    if (!draftSnapshot) {
      return null;
    }

    return fromBuilderDraft(draftSnapshot);
  }, [draftSnapshot, mode, version]);

  const data = useMemo<EstimateDocumentData | null>(() => {
    if (!baseData) {
      return null;
    }

    return applyLocationGuides(baseData, guideRows);
  }, [baseData, guideRows]);

  if (mode === 'version') {
    if (versionLoading || guidesLoading) {
      return { data: null, loading: true, errorMessage: null };
    }

    if (!version) {
      return { data: null, loading: false, errorMessage: '저장된 버전을 찾을 수 없습니다.' };
    }

    return { data, loading: false, errorMessage: null };
  }

  const loadingDraft = !draftError && (!draftSnapshot || guidesLoading);
  return {
    data,
    loading: loadingDraft,
    errorMessage: draftError,
  };
}
