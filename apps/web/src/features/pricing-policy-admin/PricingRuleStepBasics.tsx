import { Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import {
  PRICE_ITEM_GROUP_OPTIONS,
  PRICE_ITEM_OPTIONS,
  QUANTITY_SOURCE_OPTIONS,
  getPricingQuantitySourceLabelKo,
} from './constants';
import type {
  DerivedRuleConstraints,
  PricingPriceItemGroup,
  PricingPriceItemOptionKey,
  PricingQuantitySource,
  RuleFormState,
} from './types';
import {
  applyPriceItemOptionSelection,
  getEffectiveRuleForm,
  getPriceItemGroupForPreset,
  getRuleAmountInputLabel,
  getRuleAmountInterpretation,
  getSelectedPriceItemOption,
} from './utils';

function getQuantityOptions(ruleForm: RuleFormState, constraints: DerivedRuleConstraints) {
  if (constraints.quantitySourceLocked) {
    return QUANTITY_SOURCE_OPTIONS.filter((option) => option.value === constraints.effectiveQuantitySource);
  }
  if (ruleForm.priceItemPreset === 'PICKUP_DROP' || ruleForm.priceItemPreset === 'CONDITIONAL') {
    return QUANTITY_SOURCE_OPTIONS.filter(
      (option) =>
        option.value !== 'LONG_DISTANCE_SEGMENT_COUNT' &&
        option.value !== 'NIGHT_TRAIN_BLOCK_COUNT' &&
        option.value !== 'SUM_EXTRA_LODGING_COUNTS',
    );
  }
  return QUANTITY_SOURCE_OPTIONS.filter((option) => option.value === 'ONE' || option.value === 'HEADCOUNT' || option.value === 'TOTAL_DAYS');
}

export function PricingRuleStepBasics({
  ruleForm,
  setRuleForm,
  constraints,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  constraints: DerivedRuleConstraints;
}): JSX.Element {
  const effectiveForm = getEffectiveRuleForm(ruleForm);
  const quantityOptions = getQuantityOptions(ruleForm, constraints);
  const selectedGroup = getPriceItemGroupForPreset(ruleForm.priceItemPreset);
  const selectedOption = getSelectedPriceItemOption(ruleForm);
  const availableOptions = PRICE_ITEM_OPTIONS.filter((option) => option.group === selectedGroup);
  const amountInputLabel = getRuleAmountInputLabel(effectiveForm);
  const amountInputPlaceholder =
    effectiveForm.chargeScope === 'TEAM'
      ? '팀 총액 기준, 음수면 할인'
      : effectiveForm.chargeScope === 'PER_PERSON'
        ? '1인 기준 단가, 음수면 할인'
        : '음수면 할인';

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="text-sm font-semibold text-slate-900">기본 정보</div>
        <p className="mt-1 text-xs text-slate-500">{getRuleAmountInterpretation(ruleForm)}</p>
        {constraints.quantitySourceLocked ? (
          <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            수량 기준: {getPricingQuantitySourceLabelKo(constraints.effectiveQuantitySource)} ({constraints.quantitySourceReason})
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
        {effectiveForm.ruleType === 'PERCENT_UPLIFT' ? (
          <label className="grid gap-1 text-sm">
            <span>가격</span>
            <Input
              type="number"
              value={ruleForm.percentText}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, percentText: event.target.value }))}
              placeholder="예: 5"
            />
            <span className="text-xs text-slate-500">기본금 대비 정수 퍼센트로 입력합니다.</span>
          </label>
        ) : (
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
        )}

        <label className="grid gap-1 text-sm">
          <span>가격 항목 그룹</span>
          <div className="flex flex-wrap gap-2">
            {PRICE_ITEM_GROUP_OPTIONS.map((group) => (
              <button
                key={group.value}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  selectedGroup === group.value
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
                onClick={() => {
                  const nextOption =
                    PRICE_ITEM_OPTIONS.find((option) => option.group === group.value)?.value ?? selectedOption;
                  setRuleForm((prev) => applyPriceItemOptionSelection(prev, nextOption));
                }}
              >
                {group.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {PRICE_ITEM_GROUP_OPTIONS.find((group) => group.value === selectedGroup)?.description}
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          <span>세부 가격 항목</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={selectedOption}
            onChange={(event) =>
              setRuleForm((prev) => applyPriceItemOptionSelection(prev, event.target.value as PricingPriceItemOptionKey))
            }
          >
            {availableOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {availableOptions.find((option) => option.value === selectedOption)?.description}
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          <span>수량</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
            value={effectiveForm.quantitySource}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, quantitySource: event.target.value as PricingQuantitySource }))
            }
            disabled={constraints.quantitySourceLocked}
          >
            {quantityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {constraints.quantitySourceLocked ? (
            <span className="text-xs text-slate-500">{constraints.quantitySourceReason}</span>
          ) : (
            <span className="text-xs text-slate-500">조건 선택 단계에서 일부 규칙은 수량 기준이 자동 설정될 수 있습니다.</span>
          )}
        </label>

        <label className="grid gap-1 text-sm md:col-span-2">
          <span>제목</span>
          <Input
            value={ruleForm.title}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="예: 하이에이스 추가금"
          />
        </label>
      </div>
    </div>
  );
}
