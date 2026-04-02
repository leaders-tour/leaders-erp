import { Button, Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import {
  EXTERNAL_TRANSFER_MODE_OPTIONS,
  PLACE_TYPE_OPTIONS,
  QUANTITY_SOURCE_OPTIONS,
  RULE_TYPE_OPTIONS,
  TIME_BAND_OPTIONS,
  VARIANT_OPTIONS,
} from './constants';
import type {
  PlaceType,
  PricingExternalTransferMode,
  PricingQuantitySource,
  PricingRuleType,
  PricingTimeBand,
  RuleFormState,
} from './types';

export function PricingRuleFormFields({
  ruleForm,
  setRuleForm,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
}): JSX.Element {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span>규칙 분류</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={ruleForm.ruleType}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, ruleType: event.target.value as PricingRuleType }))}
          >
            {RULE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span>제목</span>
          <Input
            value={ruleForm.title}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="예: 하이에이스 추가금"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>수량 기준</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={ruleForm.quantitySource}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, quantitySource: event.target.value as PricingQuantitySource }))
            }
          >
            {QUANTITY_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {ruleForm.ruleType === 'PERCENT_UPLIFT' ? (
          <label className="grid gap-1 text-sm">
            <span>퍼센트</span>
            <Input
              type="number"
              value={ruleForm.percentText}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, percentText: event.target.value }))}
              placeholder="예: 5"
            />
          </label>
        ) : (
          <label className="grid gap-1 text-sm">
            <span>금액</span>
            <Input
              type="number"
              value={ruleForm.amountKrw}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, amountKrw: event.target.value }))}
              placeholder="음수면 할인"
            />
          </label>
        )}
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
          <Input type="number" min={1} value={ruleForm.dayMin} onChange={(event) => setRuleForm((prev) => ({ ...prev, dayMin: event.target.value }))} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>일수 최대</span>
          <Input type="number" min={1} value={ruleForm.dayMax} onChange={(event) => setRuleForm((prev) => ({ ...prev, dayMax: event.target.value }))} />
        </label>
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
        <label className="grid gap-1 text-sm">
          <span>차량 조건</span>
          <Input
            value={ruleForm.vehicleType}
            onChange={(event) => setRuleForm((prev) => ({ ...prev, vehicleType: event.target.value }))}
            placeholder="예: 하이에이스 / 푸르공"
          />
        </label>
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
        <label className="grid gap-1 text-sm">
          <span>실투어외 픽드랍 조건</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={ruleForm.externalTransferMode}
            onChange={(event) =>
              setRuleForm((prev) => ({ ...prev, externalTransferMode: event.target.value as '' | PricingExternalTransferMode }))
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

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-800">표시 기준</div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={ruleForm.chargeScope === 'TEAM' ? 'default' : 'outline'}
              onClick={() => setRuleForm((prev) => ({ ...prev, chargeScope: 'TEAM', personMode: '' }))}
            >
              팀당
            </Button>
            <Button
              type="button"
              variant={ruleForm.chargeScope === 'PER_PERSON' ? 'default' : 'outline'}
              onClick={() => setRuleForm((prev) => ({ ...prev, chargeScope: 'PER_PERSON', personMode: prev.personMode || 'SINGLE' }))}
            >
              인당/일/박
            </Button>
          </div>
          {ruleForm.chargeScope === 'PER_PERSON' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={ruleForm.personMode === 'SINGLE' ? 'default' : 'outline'}
                onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'SINGLE' }))}
              >
                1인 단수
              </Button>
              <Button
                type="button"
                variant={ruleForm.personMode === 'PER_DAY' ? 'default' : 'outline'}
                onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'PER_DAY' }))}
              >
                일 복수
              </Button>
              <Button
                type="button"
                variant={ruleForm.personMode === 'PER_NIGHT' ? 'default' : 'outline'}
                onClick={() => setRuleForm((prev) => ({ ...prev, personMode: 'PER_NIGHT' }))}
              >
                박 복수
              </Button>
            </div>
          ) : null}
          <label className="grid gap-1 text-sm">
            <span>커스텀 오른쪽 표기</span>
            <Input
              value={ruleForm.customDisplayText}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, customDisplayText: event.target.value }))}
              placeholder="비워두면 팀당/인당/일/박 규칙으로 표시"
            />
          </label>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-800">적용 Variant</div>
          <div className="flex flex-wrap gap-2">
            {VARIANT_OPTIONS.map((variant) => {
              const active = ruleForm.variantTypes.includes(variant);
              return (
                <Button
                  key={variant}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  onClick={() =>
                    setRuleForm((prev) => ({
                      ...prev,
                      variantTypes: active ? prev.variantTypes.filter((item) => item !== variant) : [...prev.variantTypes, variant],
                    }))
                  }
                >
                  {variant}
                </Button>
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
    </>
  );
}
