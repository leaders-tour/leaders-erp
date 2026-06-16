import { useMemo } from 'react';
import { fromVersion } from '../../estimate/adapters/from-version';
import type { EstimateDocumentData } from '../../estimate/model/types';
import { usePlanVersionDetail } from '../../plan/hooks';

export function useConfirmationAppendixData(planVersionId: string | null | undefined): {
  appendixData: EstimateDocumentData | null;
  loading: boolean;
} {
  const { version, loading } = usePlanVersionDetail(planVersionId ?? undefined);

  const appendixData = useMemo(() => {
    if (!version) {
      return null;
    }
    return fromVersion(version);
  }, [version]);

  return {
    appendixData,
    loading: !!planVersionId && loading,
  };
}
