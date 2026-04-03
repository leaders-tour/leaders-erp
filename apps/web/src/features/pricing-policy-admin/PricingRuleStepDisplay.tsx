import { Button, Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import type { DerivedRuleConstraints, RuleFormState } from './types';
import { getEffectiveRuleForm, getPricingDisplayPreview } from './utils';

function buildDisplaySummary(ruleForm: RuleFormState) {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  return getPricingDisplayPreview({
    priceItemPreset: effectiveForm.priceItemPreset,
    ruleType: effectiveForm.ruleType,
    chargeScope: effectiveForm.chargeScope || null,
    personMode: effectiveForm.personMode || null,
    customDisplayText: effectiveForm.customDisplayText,
    amountKrw: effectiveForm.ruleType === 'PERCENT_UPLIFT' ? null : Number(effectiveForm.amountKrw || 0),
  });
}

export function PricingRuleStepDisplay({
  ruleForm,
  setRuleForm,
  constraints,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  constraints: DerivedRuleConstraints;
}): JSX.Element {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const displayPreview = buildDisplaySummary(ruleForm);
  const isPercentRule = effectiveForm.ruleType === 'PERCENT_UPLIFT';
  const isDisplayLocked =
    constraints.chargeScopeLocked ||
    constraints.personModeLocked ||
    isPercentRule ||
    constraints.displayLockedMessage !== null;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="text-sm font-semibold text-slate-900">표시 선택</div>
        <p className="mt-1 text-xs text-slate-500">표시 기준은 금액의 해석과 예시에 영향을 줍니다. 자동 고정 규칙은 읽기 전용으로 안내합니다.</p>
        <div className="mt-3 grid gap-1 rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs font-medium text-slate-500">현재 표시 요약</span>
          <span className="text-sm font-semibold text-slate-900">{displayPreview.label}</span>
          {displayPreview.example ? <span className="text-xs text-slate-500">{displayPreview.example}</span> : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
        {isDisplayLocked ? (
          <div className="grid gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">표시 기준이 자동 설정되었습니다.</span>
            <span>{constraints.displayLockedMessage ?? '이 규칙 유형은 표시 기준을 수동으로 선택하지 않습니다.'}</span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={effectiveForm.chargeScope === 'TEAM' ? 'default' : 'outline'}
                onClick={() => setRuleForm((prev) => ({ ...prev, chargeScope: 'TEAM', personMode: '' }))}
              >
                팀당
              </Button>
              <Button
                type="button"
                variant={effectiveForm.chargeScope === 'PER_PERSON' ? 'default' : 'outline'}
                onClick={() =>
                  setRuleForm((prev) => ({ ...prev, chargeScope: 'PER_PERSON', personMode: prev.personMode || 'SINGLE' }))
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
            onChange={(event) => setRuleForm((prev) => ({ ...prev, customDisplayText: event.target.value }))}
            placeholder={isDisplayLocked ? '이 가격 항목은 자동 표기를 사용합니다.' : '비워두면 팀당/인당/일/박 규칙으로 표시'}
            disabled={isDisplayLocked}
          />
        </label>
      </div>
    </div>
  );
}
