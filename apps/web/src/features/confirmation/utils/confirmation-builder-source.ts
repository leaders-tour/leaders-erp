export const CONFIRMATION_FRESH_SOURCE_TOOLTIP =
  '연결 견적서, 확정 건 운영 정보(차량·숙소·가이드 등), 계약서 제출 내용으로 초기값을 새로 만듭니다. 기존 저장된 확정서 버전은 참고하지 않습니다.';

export type ConfirmationBuilderSource = 'fresh' | 'published' | 'draft' | 'version';

export function parseConfirmationBuilderSource(
  searchParams: URLSearchParams,
): ConfirmationBuilderSource | null {
  const raw = searchParams.get('source')?.trim().toLowerCase();
  if (raw === 'fresh' || raw === 'published' || raw === 'draft' || raw === 'version') {
    return raw;
  }
  if (searchParams.get('fresh') === '1') {
    return 'fresh';
  }
  return null;
}

export function parseConfirmationBuilderFromDocumentId(
  searchParams: URLSearchParams,
): string | null {
  const from = searchParams.get('from')?.trim();
  return from && from.length > 0 ? from : null;
}

export function buildConfirmationBuilderPath(
  confirmedTripId: string,
  source: ConfirmationBuilderSource,
  options?: { fromDocumentId?: string },
): string {
  const params = new URLSearchParams({ source });
  if (options?.fromDocumentId) {
    params.set('from', options.fromDocumentId);
  }
  return `/confirmed-trips/${confirmedTripId}/confirmation-builder?${params.toString()}`;
}

export function buildConfirmationBuilderPathFromDocument(
  document: { id: string; confirmedTripId: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
): string {
  if (document.status === 'DRAFT') {
    return buildConfirmationBuilderPath(document.confirmedTripId, 'draft', {
      fromDocumentId: document.id,
    });
  }
  return buildConfirmationBuilderPath(document.confirmedTripId, 'version', {
    fromDocumentId: document.id,
  });
}

export function resolveConfirmationBuilderRowActionLabel(
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
): string {
  return status === 'DRAFT' ? '이어쓰기' : '이 버전 기준 작성';
}

export function resolveConfirmationBuilderSourceLabel(
  source: ConfirmationBuilderSource,
  versionNumber?: number | null,
): string {
  switch (source) {
    case 'fresh':
      return '새 버전 작성';
    case 'published':
      return versionNumber != null ? `최신 발행본 기준 · v${versionNumber}` : '최신 발행본 기준';
    case 'version':
      return versionNumber != null ? `선택 버전 기준 · v${versionNumber}` : '선택 버전 기준';
    case 'draft':
      return versionNumber != null ? `임시저장 이어쓰기 · v${versionNumber}` : '임시저장 이어쓰기';
    default:
      return source;
  }
}
