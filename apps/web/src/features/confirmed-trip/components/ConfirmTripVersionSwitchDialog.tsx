import { Button, Card } from '@tour/ui';

export type ConfirmTripVersionSwitchDialogMode = 'switchExisting' | 'createNewVersion';

interface ConfirmTripVersionSwitchDialogProps {
  open: boolean;
  mode: ConfirmTripVersionSwitchDialogMode;
  currentConfirmedVersionNumber: number | null;
  /** switchExisting: 연결할 기존 버전 번호 */
  targetVersionNumber?: number | null;
  saving?: boolean;
  onClose: () => void;
  onConfirmUpdate: () => void;
  /** createNewVersion 모드에서만 사용 */
  onConfirmVersionOnly?: () => void;
}

function formatVersionLabel(versionNumber: number | null | undefined): string {
  return versionNumber != null ? `v${versionNumber}` : '다른 견적 버전';
}

export function ConfirmTripVersionSwitchDialog({
  open,
  mode,
  currentConfirmedVersionNumber,
  targetVersionNumber,
  saving = false,
  onClose,
  onConfirmUpdate,
  onConfirmVersionOnly,
}: ConfirmTripVersionSwitchDialogProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const targetLabel =
    mode === 'createNewVersion' ? '새 버전' : formatVersionLabel(targetVersionNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">
          {mode === 'createNewVersion' ? '확정 견적 갱신' : '여행 확정'}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          이 플랜은 이미 {formatVersionLabel(currentConfirmedVersionNumber)}으로 확정되어 있습니다.
          {mode === 'createNewVersion'
            ? ' 새 버전을 저장한 뒤 확정 여행의 연결 견적도 함께 갱신할까요?'
            : ` 확정 여행의 연결 견적을 ${targetLabel}으로 갱신할까요?`}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          기사·숙소·가이드·운영 일정·오픈채팅·예약일 등 확정 건에 입력한 운영 정보는 그대로 유지되고,
          견적 버전 연결과 렌탈 품목 기준만 새 버전으로 갱신됩니다.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          {mode === 'createNewVersion' && onConfirmVersionOnly ? (
            <Button variant="outline" disabled={saving} onClick={onConfirmVersionOnly}>
              버전만 저장
            </Button>
          ) : null}
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={saving}
            onClick={onConfirmUpdate}
          >
            {saving
              ? '저장 중...'
              : mode === 'createNewVersion'
                ? '저장 및 확정 갱신'
                : '갱신'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
