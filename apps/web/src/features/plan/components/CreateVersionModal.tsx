import { Button, Card, Input } from '@tour/ui';
import { useEffect, useState } from 'react';
import type { PlanVersionRow } from '../hooks';
import { toVariantLabel } from '../variant-label';

interface CreateVersionModalProps {
  open: boolean;
  versions: PlanVersionRow[];
  defaultParentVersionId: string;
  onClose: () => void;
  onConfirm: (parentVersionId: string, changeNote: string) => void;
}

export function CreateVersionModal({
  open,
  versions,
  defaultParentVersionId,
  onClose,
  onConfirm,
}: CreateVersionModalProps): JSX.Element | null {
  const [parentVersionId, setParentVersionId] = useState(defaultParentVersionId);
  const [changeNote, setChangeNote] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setParentVersionId(defaultParentVersionId);
  }, [defaultParentVersionId, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">새 버전 생성</h3>
        <p className="mt-1 text-sm text-slate-600">부모 버전과 변경 메모를 선택하고 빌더로 이동합니다.</p>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">부모 버전</span>
            <select
              value={parentVersionId}
              onChange={(event) => setParentVersionId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} ({toVariantLabel(version.variantType)})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-slate-600">변경 메모</span>
            <Input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="예: 숙소 동선 개선" />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => {
              onConfirm(parentVersionId, changeNote);
              onClose();
            }}
          >
            빌더로 이동
          </Button>
        </div>
      </Card>
    </div>
  );
}
