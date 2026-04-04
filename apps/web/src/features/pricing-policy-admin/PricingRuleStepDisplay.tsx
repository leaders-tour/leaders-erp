import { Button, Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import type { DerivedRuleConstraints, RuleFormState } from './types';
import { formatSignedCurrency } from '../estimate/utils/format';
import { getPriceItemOptionLabel } from './constants';
import { getEffectiveRuleForm, getSelectedPriceItemOption } from './utils';

function formatKrw(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function buildEstimateAdjustmentFormula(ruleForm: RuleFormState): string {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const amountKrw = Number(effectiveForm.amountKrw || 0);
  const customDisplayText = effectiveForm.customDisplayText.trim();

  if (customDisplayText) {
    return customDisplayText;
  }

  if (effectiveForm.priceItemPreset === 'NIGHT_TRAIN') {
    return `${formatKrw(amountKrw)}×n회`;
  }
  if (
    effectiveForm.priceItemPreset === 'EXTRA_LODGING' ||
    effectiveForm.priceItemPreset === 'LODGING_SELECTION'
  ) {
    return `${formatKrw(amountKrw)}*n박`;
  }
  if (effectiveForm.chargeScope === 'TEAM') {
    return `${formatKrw(amountKrw)}/n인`;
  }
  if (effectiveForm.chargeScope === 'PER_PERSON') {
    if (effectiveForm.personMode === 'PER_DAY') {
      return `${formatKrw(amountKrw)}*n일`;
    }
    if (effectiveForm.personMode === 'PER_NIGHT') {
      return `${formatKrw(amountKrw)}*n박`;
    }
    return `${formatKrw(amountKrw)}*1`;
  }

  return `${formatKrw(amountKrw)}*1`;
}

function buildEstimateAdjustmentLabel(ruleForm: RuleFormState): string {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  return (
    effectiveForm.title.trim() || getPriceItemOptionLabel(getSelectedPriceItemOption(effectiveForm))
  );
}

function EstimateAdjustmentPreview({ ruleForm }: { ruleForm: RuleFormState }): JSX.Element {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const amountKrw = Number(effectiveForm.amountKrw || 0);
  const label = buildEstimateAdjustmentLabel(ruleForm);
  const formula = buildEstimateAdjustmentFormula(ruleForm);

  return (
    <div className="w-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[#eeeeee] px-4 py-2.5 text-center text-sm font-semibold text-slate-800">
        추가 및 할인 사항
      </div>
      <div className="px-4 py-4">
        <div className="grid grid-cols-[8px,minmax(0,1fr),auto] items-start gap-x-3 text-sm leading-[1.35] text-slate-800">
          <span aria-hidden="true" />
          <span className="inline-flex min-w-0 flex-wrap items-baseline justify-center gap-x-2 justify-self-start">
            <span className="min-w-0">{label}</span>
            <strong className="font-bold">{formatSignedCurrency(amountKrw)}</strong>
          </span>
          <span className="justify-self-end text-right text-xs text-[#6b645b]">{formula}</span>
        </div>
      </div>
    </div>
  );
}

export function PricingRuleEstimatePreviewSection({
  ruleForm,
}: {
  ruleForm: RuleFormState;
}): JSX.Element {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-slate-500">견적서 1페이지 미리보기</span>
      <EstimateAdjustmentPreview ruleForm={ruleForm} />
      <span className="text-[11px] text-slate-500">
        실제 인원수·박수·횟수에 따라 `n인`, `n박`, `n회` 부분은 계산 시 확정됩니다.
      </span>
    </div>
  );
}

export function PricingRuleStepDisplay({
  ruleForm,
  setRuleForm,
  constraints,
  showEstimatePreview = true,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  constraints: DerivedRuleConstraints;
  showEstimatePreview?: boolean;
}): JSX.Element {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const isPercentRule = effectiveForm.ruleType === 'PERCENT_UPLIFT';
  const isDisplayLocked =
    constraints.chargeScopeLocked ||
    constraints.personModeLocked ||
    isPercentRule ||
    constraints.displayLockedMessage !== null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
        {isDisplayLocked ? (
          <div className="grid gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">표시 기준이 자동 설정되었습니다.</span>
            <span>
              {constraints.displayLockedMessage ??
                '이 규칙 유형은 표시 기준을 수동으로 선택하지 않습니다.'}
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={effectiveForm.chargeScope === 'TEAM' ? 'default' : 'outline'}
                onClick={() =>
                  setRuleForm((prev) => ({ ...prev, chargeScope: 'TEAM', personMode: '' }))
                }
              >
                팀당
              </Button>
              <Button
                type="button"
                variant={effectiveForm.chargeScope === 'PER_PERSON' ? 'default' : 'outline'}
                onClick={() =>
                  setRuleForm((prev) => ({
                    ...prev,
                    chargeScope: 'PER_PERSON',
                    personMode: prev.personMode || 'SINGLE',
                  }))
                }
              >
                인당/일/박
              </Button>
            </div>
            {effectiveForm.chargeScope === 'PER_PERSON' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={effectiveForm.personMode === 'SINGLE' ? 'default' : 'outline'}
                  onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'SINGLE' }))}
                >
                  1인 단수
                </Button>
                <Button
                  type="button"
                  variant={effectiveForm.personMode === 'PER_DAY' ? 'default' : 'outline'}
                  onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'PER_DAY' }))}
                >
                  일 복수
                </Button>
                <Button
                  type="button"
                  variant={effectiveForm.personMode === 'PER_NIGHT' ? 'default' : 'outline'}
                  onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'PER_NIGHT' }))}
                >
                  박 복수
                </Button>
              </div>
            ) : null}
          </>
        )}

        <label className="grid gap-1 text-sm">
          <span>커스텀 오른쪽 표기</span>
          <Input
            value={ruleForm.customDisplayText}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, customDisplayText: event.target.value }))
            }
            placeholder={
              isDisplayLocked
                ? '이 가격 항목은 자동 표기를 사용합니다.'
                : '비워두면 팀당/인당/일/박 규칙으로 표시'
            }
            disabled={isDisplayLocked}
          />
        </label>
      </div>

      {showEstimatePreview ? <PricingRuleEstimatePreviewSection ruleForm={ruleForm} /> : null}
    </div>
  );
}
