import { gql, useQuery } from '@apollo/client';
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

interface LocationGuideQueryRow {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  locationId: string | null;
  location: {
    id: string;
    name: string;
  } | null;
}

const LOCATION_GUIDES_QUERY = gql`
  query EstimateLocationGuides {
    locationGuides {
      id
      title
      description
      imageUrls
      locationId
      location {
        id
        name
      }
    }
  }
`;

function parseStopDestinationText(value: string): string | null {
  const line = value
    .split('\n')
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  if (!line) {
    return null;
  }

  const withoutParenthesis = line.replace(/\([^)]*\)/g, '').trim();
  if (!withoutParenthesis) {
    return null;
  }

  const routeParts = withoutParenthesis
    .split('→')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const candidate = routeParts.length > 0 ? (routeParts[routeParts.length - 1] ?? '') : withoutParenthesis;

  return candidate.length > 0 ? candidate : null;
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
  const { data: guidesData, loading: guidesLoading } = useQuery<{ locationGuides: LocationGuideQueryRow[] }>(LOCATION_GUIDES_QUERY);
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

    const guideRows = guidesData?.locationGuides ?? [];
    const guideByLocationId = new Map(
      guideRows
        .filter((guide): guide is LocationGuideQueryRow & { locationId: string } => typeof guide.locationId === 'string' && guide.locationId.length > 0)
        .map((guide) => [guide.locationId, guide]),
    );

    const orderedLocationIds: string[] = [];
    const seenLocationIds = new Set<string>();
    const stopLocationNameById = new Map<string, string>();
    for (const planStop of baseData.planStops) {
      const locationId = planStop.locationId;
      if (typeof locationId !== 'string' || locationId.length === 0 || seenLocationIds.has(locationId)) {
        continue;
      }

      seenLocationIds.add(locationId);
      orderedLocationIds.push(locationId);

      const parsedName = parseStopDestinationText(planStop.destinationCellText);
      if (parsedName) {
        stopLocationNameById.set(locationId, parsedName);
      }
    }

    const page3Blocks = orderedLocationIds
      .map((locationId) => {
        const guide = guideByLocationId.get(locationId);
        if (!guide) {
          return null;
        }

        return {
          locationId,
          locationName: guide.location?.name?.trim() || stopLocationNameById.get(locationId) || guide.title,
          title: guide.title,
          description: guide.description,
          imageUrls: guide.imageUrls.slice(0, 2),
        };
      })
      .filter((block): block is NonNullable<typeof block> => block !== null);

    return {
      ...baseData,
      page3Blocks,
    };
  }, [baseData, guidesData]);

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
