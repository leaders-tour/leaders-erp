import { useEffect, useMemo, useState } from 'react';
import { usePlanVersionDetail } from '../../plan/hooks';
import { fromBuilderDraft, fromVersion } from '../adapters';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData, EstimateSourceMode } from '../model/types';
import { useEstimateLocationGuides } from './use-estimate-location-guides';
import { applyLocationGuides } from '../utils/apply-location-guides';
import { readEstimateDraftSnapshotFromSessionStorage } from '../utils/draft-snapshot';
import type { PlanVersionDetail } from '../../plan/hooks';

interface EstimateSourceParams {
  mode: EstimateSourceMode;
  versionId: string | null;
  draftKey: string | null;
  /** false면 locationGuides 조회·적용 생략 (투어리스트 상세 1·2페이지 미리보기 등) */
  includeLocationGuides?: boolean;
}

interface EstimateSourceResult {
  data: EstimateDocumentData | null;
  loading: boolean;
  errorMessage: string | null;
  version: PlanVersionDetail | null;
}

export function useEstimateSource({
  mode,
  versionId,
  draftKey,
  includeLocationGuides = true,
}: EstimateSourceParams): EstimateSourceResult {
  const { version, loading: versionLoading } = usePlanVersionDetail(mode === 'version' ? versionId ?? undefined : undefined);
  const { guideRows, loading: guidesLoading } = useEstimateLocationGuides({
    skip: !includeLocationGuides,
  });
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

    if (!includeLocationGuides) {
      return baseData;
    }

    return applyLocationGuides(baseData, guideRows);
  }, [baseData, guideRows, includeLocationGuides]);

  if (mode === 'version') {
    if (versionLoading || (includeLocationGuides && guidesLoading)) {
      return { data: null, loading: true, errorMessage: null, version: null };
    }

    if (!version) {
      return { data: null, loading: false, errorMessage: '저장된 버전을 찾을 수 없습니다.', version: null };
    }

    return { data, loading: false, errorMessage: null, version };
  }

  const loadingDraft = !draftError && (!draftSnapshot || (includeLocationGuides && guidesLoading));
  return {
    data,
    loading: loadingDraft,
    errorMessage: draftError,
    version: null,
  };
}
