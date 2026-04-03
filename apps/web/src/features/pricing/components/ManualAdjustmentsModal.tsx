import { Button, Card, Input } from '@tour/ui';

export interface ManualAdjustmentDraftRow {
  kind: 'ADD' | 'DISCOUNT';
  title: string;
  chargeScope: 'TEAM' | 'PER_PERSON';
  personMode: 'SINGLE' | 'PER_DAY' | 'PER_NIGHT';
  countValue: string;
  amountKrw: string;
  customDisplayText: string;
}

export interface ManualAdjustmentPresetOption {
  id: string;
  title: string;
  kind: 'ADD' | 'DISCOUNT';
  chargeScope: 'TEAM' | 'PER_PERSON';
  personMode: 'SINGLE' | 'PER_DAY' | 'PER_NIGHT';
  amountKrw: number;
  customDisplayText: string;
}

interface ManualAdjustmentsModalProps {
  open: boolean;
  rows: ManualAdjustmentDraftRow[];
  presetOptions: ManualAdjustmentPresetOption[];
  onClose: () => void;
  onAddRow: (kind: 'ADD' | 'DISCOUNT') => void;
  onAddPresetRow: (preset: ManualAdjustmentPresetOption) => void;
  onUpdateRow: (index: number, nextRow: ManualAdjustmentDraftRow) => void;
  onRemoveRow: (index: number) => void;
}

function SectionTitle({ title, description }: { title: string; description: string }): JSX.Element {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function ManualAdjustmentsModal({
  open,
  rows,
  presetOptions,
  onClose,
  onAddRow,
  onAddPresetRow,
  onUpdateRow,
  onRemoveRow,
}: ManualAdjustmentsModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const additions = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.kind === 'ADD');
  const discounts = rows
    .map((row, index) => ({ ...row, index }))
    .filter((row) => row.kind === 'DISCOUNT');
  const additionPresets = presetOptions.filter((preset) => preset.kind === 'ADD');
  const discountPresets = presetOptions.filter((preset) => preset.kind === 'DISCOUNT');

  const renderRow = (row: ManualAdjustmentDraftRow & { index: number }) => {
    const update = (patch: Partial<ManualAdjustmentDraftRow>) => onUpdateRow(row.index, { ...row, ...patch });
    const isPerPerson = row.chargeScope === 'PER_PERSON';
    const needsCount = row.personMode === 'PER_DAY' || row.personMode === 'PER_NIGHT';

    return (
      <div key={`${row.kind}-${row.index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">제목</span>
            <Input value={row.title} onChange={(event) => update({ title: event.target.value })} placeholder="내용" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">금액</span>
            <Input
              type="number"
              min={0}
              value={row.amountKrw}
              onChange={(event) => update({ amountKrw: event.target.value })}
              placeholder="금액"
            />
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm text-slate-700">과금 기준</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={row.chargeScope === 'TEAM' ? 'default' : 'outline'}
              onClick={() => update({ chargeScope: 'TEAM', personMode: 'SINGLE', countValue: '' })}
            >
              팀당
            </Button>
            <Button
              type="button"
              variant={row.chargeScope === 'PER_PERSON' ? 'default' : 'outline'}
              onClick={() => update({ chargeScope: 'PER_PERSON', personMode: row.personMode || 'SINGLE' })}
            >
              인당
            </Button>
          </div>
        </div>

        {isPerPerson ? (
          <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-sm text-slate-700">인당 세부 기준</span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={row.personMode === 'SINGLE' ? 'default' : 'outline'} onClick={() => update({ personMode: 'SINGLE', countValue: '' })}>
                1인 단수
              </Button>
              <Button type="button" variant={row.personMode === 'PER_DAY' ? 'default' : 'outline'} onClick={() => update({ personMode: 'PER_DAY', countValue: row.countValue || '1' })}>
                일 복수
              </Button>
              <Button type="button" variant={row.personMode === 'PER_NIGHT' ? 'default' : 'outline'} onClick={() => update({ personMode: 'PER_NIGHT', countValue: row.countValue || '1' })}>
                박 복수
              </Button>
            </div>
            {needsCount ? (
              <label className="grid gap-1 text-sm md:max-w-xs">
                <span className="text-slate-700">{row.personMode === 'PER_DAY' ? '일수' : '박수'}</span>
                <Input
                  type="number"
                  min={1}
                  value={row.countValue}
                  onChange={(event) => update({ countValue: event.target.value })}
                  placeholder={row.personMode === 'PER_DAY' ? '일수' : '박수'}
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="text-slate-700">오른쪽 표기 커스텀 (선택)</span>
          <Input
            value={row.customDisplayText}
            onChange={(event) => update({ customDisplayText: event.target.value })}
            placeholder="비워두면 팀당/인당/일/박 기준으로 자동 표기"
          />
        </label>

        <div className="flex justify-end">
          <Button variant="destructive" onClick={() => onRemoveRow(row.index)}>
            삭제
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Card className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">기타 금액</h2>
                <p className="mt-1 text-sm text-slate-600">추가 금액과 할인 금액을 모달 안에서 정리합니다.</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle title="추가" description="총액에 더해질 금액입니다." />
                  <Button variant="outline" onClick={() => onAddRow('ADD')}>
                    추가하기
                  </Button>
                </div>
                {additionPresets.length > 0 ? (
                  <div className="mt-4 grid gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-3">
                    <span className="text-xs font-medium text-slate-600">정책 프리셋</span>
                    <div className="flex flex-wrap gap-2">
                      {additionPresets.map((preset) => (
                        <Button key={preset.id} type="button" variant="outline" onClick={() => onAddPresetRow(preset)}>
                          {preset.title} · {preset.amountKrw.toLocaleString('ko-KR')}원
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {additions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      추가 항목이 없습니다.
                    </div>
                  ) : (
                    additions.map(renderRow)
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle title="할인" description="총액에서 차감될 금액입니다." />
                  <Button variant="outline" onClick={() => onAddRow('DISCOUNT')}>
                    추가하기
                  </Button>
                </div>
                {discountPresets.length > 0 ? (
                  <div className="mt-4 grid gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-3">
                    <span className="text-xs font-medium text-slate-600">정책 프리셋</span>
                    <div className="flex flex-wrap gap-2">
                      {discountPresets.map((preset) => (
                        <Button key={preset.id} type="button" variant="outline" onClick={() => onAddPresetRow(preset)}>
                          {preset.title} · {preset.amountKrw.toLocaleString('ko-KR')}원
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {discounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      할인 항목이 없습니다.
                    </div>
                  ) : (
                    discounts.map(renderRow)
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={onClose}>완료</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
