import type { ExternalTransfer } from '../../plan/external-transfer';
import type { EstimateBuilderDraftSnapshot } from '../model/types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isEstimateDraftSnapshot(value: unknown): value is EstimateBuilderDraftSnapshot {
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
    Array.isArray(value.transportGroups) &&
    Array.isArray(value.externalTransfers) &&
    typeof value.specialNote === 'string' &&
    typeof value.includeRentalItems === 'boolean' &&
    typeof value.rentalItemsText === 'string' &&
    typeof value.remark === 'string' &&
    Array.isArray(value.eventNames) &&
    Array.isArray(value.planStops)
  );
}

export function normalizeEstimateDraftSnapshot(snapshot: EstimateBuilderDraftSnapshot): EstimateBuilderDraftSnapshot {
  return {
    ...snapshot,
    transportGroups: snapshot.transportGroups.map((group) => ({
      teamName: group.teamName ?? '',
      headcount: group.headcount ?? 1,
      flightInDate: group.flightInDate ?? '',
      flightInTime: group.flightInTime ?? '',
      flightOutDate: group.flightOutDate ?? '',
      flightOutTime: group.flightOutTime ?? '',
      pickupDate: group.pickupDate ?? '',
      pickupTime: group.pickupTime ?? '',
      pickupPlaceType: group.pickupPlaceType ?? 'AIRPORT',
      pickupPlaceCustomText: group.pickupPlaceCustomText ?? '',
      dropDate: group.dropDate ?? '',
      dropTime: group.dropTime ?? '',
      dropPlaceType: group.dropPlaceType ?? 'AIRPORT',
      dropPlaceCustomText: group.dropPlaceCustomText ?? '',
    })),
    externalTransfers: (snapshot.externalTransfers ?? []) as ExternalTransfer[],
    specialNote: snapshot.specialNote ?? '',
  };
}

export function readEstimateDraftSnapshotFromSessionStorage(
  draftKey: string | null,
): { snapshot: EstimateBuilderDraftSnapshot | null; errorMessage: string | null } {
  if (!draftKey) {
    return {
      snapshot: null,
      errorMessage: '임시 출력 키가 없습니다. 일정 빌더에서 다시 생성해주세요.',
    };
  }

  const raw = window.sessionStorage.getItem(draftKey);
  if (!raw) {
    return {
      snapshot: null,
      errorMessage: '임시 출력 데이터가 만료되었거나 존재하지 않습니다. 일정 빌더에서 다시 생성해주세요.',
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isEstimateDraftSnapshot(parsed)) {
      return {
        snapshot: null,
        errorMessage: '임시 출력 데이터 형식이 올바르지 않습니다. 일정 빌더에서 다시 생성해주세요.',
      };
    }

    return {
      snapshot: normalizeEstimateDraftSnapshot(parsed),
      errorMessage: null,
    };
  } catch (_error) {
    return {
      snapshot: null,
      errorMessage: '임시 출력 데이터를 읽는 중 오류가 발생했습니다. 일정 빌더에서 다시 생성해주세요.',
    };
  }
}
