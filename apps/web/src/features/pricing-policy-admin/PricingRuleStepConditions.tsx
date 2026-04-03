import { Button, Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import {
  CONDITION_CATEGORY_OPTIONS,
  EXTERNAL_TRANSFER_MODE_OPTIONS,
  EXTERNAL_TRANSFER_PRESET_OPTIONS,
  LODGING_SELECTION_LEVEL_OPTIONS,
  PLACE_TYPE_OPTIONS,
  TIME_BAND_OPTIONS,
  VARIANT_OPTIONS,
} from './constants';
import type {
  ConditionCategoryKey,
  DerivedRuleConstraints,
  PlaceType,
  PricingExternalTransferMode,
  PricingLodgingSelectionLevel,
  PricingTimeBand,
  RuleFormState,
} from './types';
import { clearConditionCategory, getConditionCategorySummary } from './utils';

function OpenConditionSummaryChips({
  ruleForm,
  openCategories,
  onFocusCategory,
}: {
  ruleForm: RuleFormState;
  openCategories: ConditionCategoryKey[];
  onFocusCategory: (value: ConditionCategoryKey) => void;
}): JSX.Element | null {
  if (openCategories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {openCategories.map((category) => (
        <button
          key={category}
          type="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
          onClick={() => onFocusCategory(category)}
        >
          {CONDITION_CATEGORY_OPTIONS.find((option) => option.value === category)?.label}: {getConditionCategorySummary(ruleForm, category) ?? '입력 대기'}
        </button>
      ))}
    </div>
  );
}

function ConditionPanel({
  category,
  ruleForm,
  setRuleForm,
}: {
  category: ConditionCategoryKey;
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
}): JSX.Element {
  switch (category) {
    case 'headcountDays':
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span>인원 최소</span>
            <Input
              type="number"
              min={0}
              value={ruleForm.headcountMin}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, headcountMin: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>인원 최대</span>
            <Input
              type="number"
              min={0}
              value={ruleForm.headcountMax}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, headcountMax: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>일수 최소</span>
            <Input
              type="number"
              min={1}
              value={ruleForm.dayMin}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, dayMin: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>일수 최대</span>
            <Input
              type="number"
              min={1}
              value={ruleForm.dayMax}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, dayMax: event.target.value }))}
            />
          </label>
        </div>
      );
    case 'travelDate':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>여행 시작일 조건 From</span>
            <Input
              type="date"
              value={ruleForm.travelDateFrom}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, travelDateFrom: event.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>여행 시작일 조건 To</span>
            <Input
              type="date"
              value={ruleForm.travelDateTo}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, travelDateTo: event.target.value }))}
            />
          </label>
        </div>
      );
    case 'vehicle':
      return (
        <label className="grid gap-1 text-sm">
          <span>차량 조건</span>
          <Input
            value={ruleForm.vehicleType}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, vehicleType: event.target.value }))}
            placeholder="예: 하이에이스 / 푸르공"
          />
        </label>
      );
    case 'variant':
      return (
        <div className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">적용 Variant</span>
          <div className="flex flex-wrap gap-2">
            {VARIANT_OPTIONS.map((variant) => {
              const active = ruleForm.variantTypes.includes(variant.value);
              return (
                <Button
                  key={variant.value}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  onClick={() =>
                    setRuleForm((prev) => ({
                      ...prev,
                      variantTypes: active
                        ? prev.variantTypes.filter((item) => item !== variant.value)
                        : [...prev.variantTypes, variant.value],
                    }))
                  }
                >
                  {variant.label}
                </Button>
              );
            })}
          </div>
        </div>
      );
    case 'flight':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>항공 IN 시간대</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.flightInTimeBand}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, flightInTimeBand: event.target.value as '' | PricingTimeBand }))}
            >
              <option value="">없음</option>
              {TIME_BAND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>항공 OUT 시간대</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.flightOutTimeBand}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, flightOutTimeBand: event.target.value as '' | PricingTimeBand }))}
            >
              <option value="">없음</option>
              {TIME_BAND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      );
    case 'pickupDrop':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>픽업 장소 조건</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.pickupPlaceType}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, pickupPlaceType: event.target.value as '' | PlaceType }))}
            >
              <option value="">없음</option>
              {PLACE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>드랍 장소 조건</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.dropPlaceType}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, dropPlaceType: event.target.value as '' | PlaceType }))}
            >
              <option value="">없음</option>
              {PLACE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      );
    case 'externalTransfer':
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>실투어외 픽드랍 조건</span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={ruleForm.externalTransferMode}
                onChange={(event) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    externalTransferMode: event.target.value as '' | PricingExternalTransferMode,
                  }))
                }
              >
                <option value="">없음</option>
                {EXTERNAL_TRANSFER_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>실투어외 픽드랍 최소 건수</span>
              <Input
                type="number"
                min={1}
                value={ruleForm.externalTransferMinCount}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, externalTransferMinCount: event.target.value }))}
              />
            </label>
          </div>
          <div className="grid gap-2">
            <span className="text-xs font-medium text-slate-600">외부 이동 프리셋</span>
            <div className="flex flex-wrap gap-2">
              {EXTERNAL_TRANSFER_PRESET_OPTIONS.map((option) => {
                const active = ruleForm.externalTransferPresetCodes.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    onClick={() =>
                      setRuleForm((prev) => ({
                        ...prev,
                        externalTransferPresetCodes: active
                          ? prev.externalTransferPresetCodes.filter((item) => item !== option.value)
                          : [...prev.externalTransferPresetCodes, option.value],
                      }))
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      );
    case 'lodgingSelection':
      return ruleForm.priceItemPreset === 'LODGING_SELECTION' ? (
        <label className="grid gap-1 text-sm">
          <span>숙소 업그레이드 등급</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={ruleForm.lodgingSelectionLevel}
            onChange={(event) =>
              setRuleForm((prev) => ({
                ...prev,
                lodgingSelectionLevel: event.target.value as '' | PricingLodgingSelectionLevel,
              }))
            }
          >
            <option value="">없음</option>
            {LODGING_SELECTION_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">선택하면 수량과 표시 기준은 자동으로 고정됩니다.</span>
        </label>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          숙소 업그레이드 조건은 `숙소 업그레이드` 가격 항목에서만 사용할 수 있습니다.
        </div>
      );
    default:
      return <></>;
  }
}

export function PricingRuleStepConditions({
  ruleForm,
  setRuleForm,
  openCategories,
  setOpenCategories,
  constraints,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
  openCategories: ConditionCategoryKey[];
  setOpenCategories: Dispatch<SetStateAction<ConditionCategoryKey[]>>;
  constraints: DerivedRuleConstraints;
}): JSX.Element {
  const allowedCategories = new Set(constraints.allowedConditionCategories);
  const visibleOpenCategories = openCategories.filter((category) => allowedCategories.has(category));
  const availableCategories = CONDITION_CATEGORY_OPTIONS.filter(
    (option) => allowedCategories.has(option.value) && !visibleOpenCategories.includes(option.value),
  );
  const addCategory = (category: ConditionCategoryKey) => {
    setOpenCategories((prev) => (prev.includes(category) ? prev : [...prev, category]));
  };
  const removeCategory = (category: ConditionCategoryKey) => {
    setRuleForm((prev) => clearConditionCategory(prev, category));
    setOpenCategories((prev) => prev.filter((item) => item !== category));
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="text-sm font-semibold text-slate-900">조건 선택</div>
        <p className="mt-1 text-xs text-slate-500">
          {constraints.allowedConditionCategories.length === 0
            ? '이 가격 항목은 자동 조건 없이 사용됩니다.'
            : '카테고리에서 필요한 조건만 골라서 입력합니다. 비워두면 해당 조건은 적용되지 않습니다.'}
        </p>
        <div className="mt-3">
          <OpenConditionSummaryChips
            ruleForm={ruleForm}
            openCategories={visibleOpenCategories}
            onFocusCategory={(category) => {
              const element = document.getElementById(`condition-panel-${category}`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
          />
        </div>
        {constraints.quantitySourceLocked || constraints.displayLockedMessage ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {constraints.quantitySourceLocked ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                수량 자동 설정
              </span>
            ) : null}
            {constraints.displayLockedMessage ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                표시 자동 설정
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
        <div className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">조건 추가</span>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                onClick={() => addCategory(option.value)}
              >
                + {option.label}
              </Button>
            ))}
          </div>
          {constraints.allowedConditionCategories.length === 0 ? (
            <span className="text-xs text-slate-500">이 가격 항목은 별도 조건을 받지 않습니다.</span>
          ) : availableCategories.length === 0 ? (
            <span className="text-xs text-slate-500">추가 가능한 조건을 모두 열었습니다.</span>
          ) : null}
        </div>

        <div className="grid gap-4">
          {visibleOpenCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              아직 선택한 조건이 없습니다. 위 `+ 버튼`으로 필요한 조건 블록을 추가해 주세요.
            </div>
          ) : null}
          {visibleOpenCategories.map((category) => {
            const categoryMeta = CONDITION_CATEGORY_OPTIONS.find((option) => option.value === category);
            return (
              <div key={category} id={`condition-panel-${category}`} className="grid gap-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{categoryMeta?.label}</div>
                    <p className="mt-1 text-xs text-slate-500">{categoryMeta?.description}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => removeCategory(category)}>
                    제거
                  </Button>
                </div>
                <ConditionPanel category={category} ruleForm={ruleForm} setRuleForm={setRuleForm} />
              </div>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={ruleForm.isEnabled}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
          />
          규칙 활성화
        </label>
      </div>
    </div>
  );
}
