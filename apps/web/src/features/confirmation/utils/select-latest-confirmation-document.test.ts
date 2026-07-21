import { describe, expect, it } from 'vitest';
import type { ConfirmationDocumentRow } from '../model/types';
import {
  resolveConfirmationPreviewPlanVersionId,
  resolvePreviewConfirmationDocument,
  selectLatestConfirmationDocument,
} from './select-latest-confirmation-document';

function makeDocument(
  overrides: Partial<ConfirmationDocumentRow> & Pick<ConfirmationDocumentRow, 'id' | 'updatedAt'>,
): ConfirmationDocumentRow {
  return {
    confirmedTripId: 'trip-1',
    versionNumber: 1,
    status: 'DRAFT',
    snapshot: {
      leaderName: '홍길동',
      destination: '울란바토르',
      headcountText: '10명',
      travelPeriodText: '2026-07-01 (3박 4일)',
      vehicleType: '스타렉스',
      flightInText: '',
      flightOutText: '',
      pickupText: '',
      dropText: '',
      externalPickupDropText: '',
      specialNote: '',
      rentalItemsText: '',
      eventNames: '',
      remark: '',
      balancePerPersonText: '',
      guideName: '',
      meetingPlace: '',
      travelers: [],
      accommodationLines: [],
      sourcePlanVersionId: 'plan-version-from-snapshot',
    },
    createdAt: overrides.updatedAt,
    ...overrides,
  };
}

describe('selectLatestConfirmationDocument', () => {
  it('returns null when there are no documents', () => {
    expect(selectLatestConfirmationDocument([])).toBeNull();
  });

  it('prefers the most recently updated document including drafts', () => {
    const documents = [
      makeDocument({
        id: 'published',
        status: 'PUBLISHED',
        versionNumber: 2,
        updatedAt: '2026-07-10T10:00:00.000Z',
      }),
      makeDocument({
        id: 'draft',
        status: 'DRAFT',
        versionNumber: 3,
        updatedAt: '2026-07-12T09:00:00.000Z',
      }),
      makeDocument({
        id: 'archived',
        status: 'ARCHIVED',
        versionNumber: 1,
        updatedAt: '2026-07-01T09:00:00.000Z',
      }),
    ];

    expect(selectLatestConfirmationDocument(documents)?.id).toBe('draft');
  });

  it('sorts by updatedAt even when the API order is not guaranteed', () => {
    const documents = [
      makeDocument({
        id: 'older',
        updatedAt: '2026-07-01T09:00:00.000Z',
      }),
      makeDocument({
        id: 'newer',
        updatedAt: '2026-07-20T09:00:00.000Z',
      }),
    ];

    expect(selectLatestConfirmationDocument(documents)?.id).toBe('newer');
  });
});

describe('resolvePreviewConfirmationDocument', () => {
  const documents = [
    makeDocument({
      id: 'older',
      versionNumber: 1,
      updatedAt: '2026-07-01T09:00:00.000Z',
    }),
    makeDocument({
      id: 'newer',
      versionNumber: 2,
      updatedAt: '2026-07-20T09:00:00.000Z',
    }),
  ];

  it('returns null when there are no documents', () => {
    expect(resolvePreviewConfirmationDocument([], 'older')).toBeNull();
  });

  it('returns the selected document when previewDocumentId matches', () => {
    expect(resolvePreviewConfirmationDocument(documents, 'older')?.id).toBe('older');
  });

  it('falls back to the latest document when previewDocumentId is missing', () => {
    expect(resolvePreviewConfirmationDocument(documents)?.id).toBe('newer');
    expect(resolvePreviewConfirmationDocument(documents, '')?.id).toBe('newer');
  });

  it('falls back to the latest document when previewDocumentId is invalid', () => {
    expect(resolvePreviewConfirmationDocument(documents, 'missing')?.id).toBe('newer');
  });
});

describe('resolveConfirmationPreviewPlanVersionId', () => {
  it('uses planVersionId when present', () => {
    const document = makeDocument({
      id: 'doc-1',
      updatedAt: '2026-07-01T09:00:00.000Z',
      planVersionId: 'plan-version-on-document',
    });

    expect(resolveConfirmationPreviewPlanVersionId(document)).toBe('plan-version-on-document');
  });

  it('falls back to snapshot sourcePlanVersionId', () => {
    const document = makeDocument({
      id: 'doc-1',
      updatedAt: '2026-07-01T09:00:00.000Z',
      planVersionId: null,
    });

    expect(resolveConfirmationPreviewPlanVersionId(document)).toBe('plan-version-from-snapshot');
  });

  it('returns null when document is missing', () => {
    expect(resolveConfirmationPreviewPlanVersionId(null)).toBeNull();
  });
});
