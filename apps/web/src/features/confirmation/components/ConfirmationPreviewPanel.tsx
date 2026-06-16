import { ConfirmationDocument } from '../components/ConfirmationDocument';
import type { ConfirmationDocumentSnapshot } from '../model/types';
import { snapshotToDocumentData } from '../utils/format';

interface ConfirmationPreviewPanelProps {
  snapshot: ConfirmationDocumentSnapshot;
}

export function ConfirmationPreviewPanel({ snapshot }: ConfirmationPreviewPanelProps) {
  return <ConfirmationDocument data={snapshotToDocumentData(snapshot)} viewMode="screen-preview" />;
}
