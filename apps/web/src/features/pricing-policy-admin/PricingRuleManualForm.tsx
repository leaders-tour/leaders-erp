import { Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import { PricingRuleEstimatePreviewSection, PricingRuleStepDisplay } from './PricingRuleStepDisplay';
import type { DerivedRuleConstraints, PricingPriceItemGroup, RuleFormState } from './types';
import { getEffectiveRuleForm, getRuleAmountInputLabel } from './utils';

export function PricingRuleManualForm({
  ruleForm,
  setRuleForm,
  constraints,
  lockedGroup,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  constraints: DerivedRuleConstraints;
  lockedGroup?: PricingPriceItemGroup | null;
}): JSX.Element {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const amountInputLabel = getRuleAmountInputLabel(effectiveForm);
  const amountInputPlaceholder =
    effectiveForm.chargeScope === 'TEAM'
      ? '팀 총액 기준, 음수면 할인'
      : effectiveForm.chargeScope === 'PER_PERSON'
        ? '1인 기준 단가, 음수면 할인'
        : '음수면 할인';

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>제목</span>
          <Input
            value={ruleForm.title}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="예: 기사팁 / 샤브샤브 누락 할인"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span>가격</span>
          <Input
            type="number"
            value={ruleForm.amountKrw}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, amountKrw: event.target.value }))}
            placeholder={amountInputPlaceholder}
          />
          <span className="text-xs text-slate-500">{amountInputLabel} 기준으로 저장됩니다.</span>
        </label>
      </div>

      <PricingRuleStepDisplay
        ruleForm={ruleForm}
        setRuleForm={setRuleForm}
        constraints={constraints}
        showEstimatePreview={false}
      />

      <PricingRuleEstimatePreviewSection ruleForm={ruleForm} />
    </div>
  );
}
