import { Button, Input } from '@tour/ui';
import type { Dispatch, SetStateAction } from 'react';
import {
  EXTERNAL_TRANSFER_MODE_OPTIONS,
  EXTERNAL_TRANSFER_PRESET_OPTIONS,
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
import { getRuleAmountInputLabel } from './utils';

export function PricingRuleFormFields({
  ruleForm,
  setRuleForm,
}: {
  ruleForm: RuleFormState;
  setRuleForm: Dispatch<SetStateAction<RuleFormState>>;
}): JSX.Element {
  const amountInputLabel = getRuleAmountInputLabel(ruleForm);
  const amountInputPlaceholder =
    ruleForm.chargeScope === 'TEAM'
      ? '팀 총액 기준, 음수면 할인'
      : ruleForm.chargeScope === 'PER_PERSON'
        ? '1인 기준 단가, 음수면 할인'
        : '음수면 할인';
  const quantityOptions =
    ruleForm.ruleType === 'CONDITIONAL_ADDON'
      ? QUANTITY_SOURCE_OPTIONS
      : QUANTITY_SOURCE_OPTIONS.filter(
          (option) => option.value !== 'LONG_DISTANCE_SEGMENT_COUNT' && option.value !== 'NIGHT_TRAIN_BLOCK_COUNT',
        );

  return (
    <>
      <div className="grid gap-4">
        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">기본 정보</div>
            <p className="mt-1 text-xs text-slate-500">규칙의 성격과 기본 계산 방식을 정합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>규칙 분류</span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={ruleForm.ruleType}
                onChange={(event) =>
                  setRuleForm((prev) => {
                    const nextRuleType = event.target.value as PricingRuleType;
                    const keepsSpecialQuantity =
                      nextRuleType === 'CONDITIONAL_ADDON' ||
                      (prev.quantitySource !== 'LONG_DISTANCE_SEGMENT_COUNT' &&
                        prev.quantitySource !== 'NIGHT_TRAIN_BLOCK_COUNT');
                    return {
                      ...prev,
                      ruleType: nextRuleType,
                      quantitySource: keepsSpecialQuantity ? prev.quantitySource : 'ONE',
                    };
                  })
                }
              >
                {RULE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                {quantityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {ruleForm.ruleType === 'CONDITIONAL_ADDON' ? (
                <span className="text-xs text-slate-500">
                  장거리는 `장거리 구간 수`, 야간열차는 `야간열차 운행 수`를 선택하면 횟수 비례형으로 계산됩니다.
                </span>
              ) : null}
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span>제목</span>
              <Input
                value={ruleForm.title}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="예: 하이에이스 추가금"
              />
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
                <span>{amountInputLabel}</span>
                <Input
                  type="number"
                  value={ruleForm.amountKrw}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, amountKrw: event.target.value }))}
                  placeholder={amountInputPlaceholder}
                />
                <span className="text-xs text-slate-500">
                  {ruleForm.chargeScope === 'TEAM'
                    ? '팀당을 선택하면 이 값은 1회 기준 총액으로 저장됩니다.'
                    : ruleForm.chargeScope === 'PER_PERSON'
                      ? '인당/일당/박당을 선택하면 이 값은 1인 기준 단가로 저장됩니다.'
                      : '표시 기준을 먼저 고르면 총액/단가 의미가 더 명확해집니다.'}
                </span>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              <span>차량 조건</span>
              <Input
                value={ruleForm.vehicleType}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, vehicleType: event.target.value }))}
                placeholder="예: 하이에이스 / 푸르공"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">대상 범위</div>
            <p className="mt-1 text-xs text-slate-500">인원수와 여행 일수에 따른 적용 범위를 설정합니다.</p>
          </div>
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
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">여행 시작</div>
            <p className="mt-1 text-xs text-slate-500">출발 날짜 구간에 따라 규칙 적용 여부를 제한합니다.</p>
          </div>
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
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">항공</div>
            <p className="mt-1 text-xs text-slate-500">입국/출국 시간대 조건으로 규칙을 한정합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>항공 IN 시간대</span>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={ruleForm.flightInTimeBand}
                onChange={(event) =>
                  setRuleForm((prev) => ({ ...prev, flightInTimeBand: event.target.value as '' | PricingTimeBand }))
                }
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
                onChange={(event) =>
                  setRuleForm((prev) => ({ ...prev, flightOutTimeBand: event.target.value as '' | PricingTimeBand }))
                }
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
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">픽업/드랍</div>
            <p className="mt-1 text-xs text-slate-500">장소 조건이 필요한 경우에만 선택합니다.</p>
          </div>
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
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">실투어외 픽드랍</div>
            <p className="mt-1 text-xs text-slate-500">방향, 최소 건수, 프리셋 코드로 외부 이동 규칙 범위를 좁힙니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
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
          {ruleForm.ruleType === 'CONDITIONAL_ADDON' &&
          (ruleForm.quantitySource === 'LONG_DISTANCE_SEGMENT_COUNT' || ruleForm.quantitySource === 'NIGHT_TRAIN_BLOCK_COUNT') ? (
            <p className="text-xs text-slate-500">
              장거리·야간열차처럼 횟수 비례형 규칙도 `팀당`으로 두면 `총액/인원` 형태로 표시됩니다.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-800">적용 Variant</div>
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
