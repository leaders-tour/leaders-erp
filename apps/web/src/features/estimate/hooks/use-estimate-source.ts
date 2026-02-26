import { useEffect, useMemo, useState } from 'react';
import { usePlanVersionDetail } from '../../plan/hooks';
import { fromBuilderDraft, fromVersion } from '../adapters';
import type { EstimateBuilderDraftSnapshot, EstimateDocumentData, EstimateSourceMode } from '../model/types';

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDraftSnapshot(value: unknown): value is EstimateBuilderDraftSnapshot {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.planTitle === 'string' &&
    typeof value.regionName === 'string' &&
    typeof value.leaderName === 'string' &&
    typeof value.travelStartDate === 'string' &&
    typeof value.travelEndDate === 'string' &&
    typeof value.vehicleType === 'string' &&
    typeof value.flightInTime === 'string' &&
    typeof value.flightOutTime === 'string' &&
    typeof value.pickupDropNote === 'string' &&
    typeof value.externalPickupDropNote === 'string' &&
    typeof value.includeRentalItems === 'boolean' &&
    typeof value.rentalItemsText === 'string' &&
    typeof value.remark === 'string' &&
    Array.isArray(value.eventNames) &&
    Array.isArray(value.planStops)
  );
}

export function useEstimateSource({ mode, versionId, draftKey }: EstimateSourceParams): EstimateSourceResult {
  const { version, loading: versionLoading } = usePlanVersionDetail(mode === 'version' ? versionId ?? undefined : undefined);
  const [draftSnapshot, setDraftSnapshot] = useState<EstimateBuilderDraftSnapshot | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'draft') {
      setDraftSnapshot(null);
      setDraftError(null);
      return;
    }

    if (!draftKey) {
      setDraftSnapshot(null);
      setDraftError('임시 출력 키가 없습니다. 일정 빌더에서 다시 생성해주세요.');
      return;
    }

    const raw = window.sessionStorage.getItem(draftKey);
    if (!raw) {
      setDraftSnapshot(null);
      setDraftError('임시 출력 데이터가 만료되었거나 존재하지 않습니다. 일정 빌더에서 다시 생성해주세요.');
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isDraftSnapshot(parsed)) {
        setDraftSnapshot(null);
        setDraftError('임시 출력 데이터 형식이 올바르지 않습니다. 일정 빌더에서 다시 생성해주세요.');
        return;
      }

      setDraftSnapshot(parsed);
      setDraftError(null);
    } catch (_error) {
      setDraftSnapshot(null);
      setDraftError('임시 출력 데이터를 읽는 중 오류가 발생했습니다. 일정 빌더에서 다시 생성해주세요.');
    }
  }, [draftKey, mode]);

  const data = useMemo<EstimateDocumentData | null>(() => {
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

  if (mode === 'version') {
    if (versionLoading) {
      return { data: null, loading: true, errorMessage: null };
    }

    if (!version) {
      return { data: null, loading: false, errorMessage: '저장된 버전을 찾을 수 없습니다.' };
    }

    return { data, loading: false, errorMessage: null };
  }

  const loadingDraft = !draftError && !draftSnapshot;
  return {
    data,
    loading: loadingDraft,
    errorMessage: draftError,
  };
}
