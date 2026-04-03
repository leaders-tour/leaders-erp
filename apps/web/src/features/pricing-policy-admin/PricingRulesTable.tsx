import { Button, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import {
  EXTERNAL_TRANSFER_MODE_OPTIONS,
  PLACE_TYPE_OPTIONS,
  TIME_BAND_OPTIONS,
  getExternalTransferPresetLabel,
  getLodgingSelectionLevelLabel,
  getPriceItemGroupLabel,
  getPriceItemOptionLabel,
  getPriceItemPresetLabel,
  getPricingQuantitySourceLabelKo,
} from './constants';
import type { PricingPriceItemGroup, PricingRuleRow } from './types';
import {
  getPriceItemGroupForPreset,
  getPricingDisplayPreview,
  getSelectedPriceItemOption,
  toDateInputValue,
  toRuleForm,
} from './utils';

type ConditionChip = {
  label: string;
  className: string;
};

function formatCalculationLabel(rule: PricingRuleRow): string {
  if (rule.ruleType === 'PERCENT_UPLIFT') {
    return `기본금의 ${(rule.percentBps ?? 0) / 100}%`;
  }

  const amountLabel = `${rule.amountKrw ?? 0}원`;
  if (rule.lodgingSelectionLevel) {
    return `${amountLabel} x 선택 박수`;
  }
  if (rule.quantitySource === 'ONE') {
    return `${amountLabel} 1회 적용`;
  }

  return `${amountLabel} x ${getPricingQuantitySourceLabelKo(rule.quantitySource)}`;
}

function getOptionLabel(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getConditionChips(rule: PricingRuleRow): ConditionChip[] {
  const chips: ConditionChip[] = [];

  if (rule.headcountMin) {
    chips.push({ label: `인원 ≥ ${rule.headcountMin}`, className: 'border-sky-200 bg-sky-50 text-sky-700' });
  }
  if (rule.headcountMax) {
    chips.push({ label: `인원 ≤ ${rule.headcountMax}`, className: 'border-sky-200 bg-sky-50 text-sky-700' });
  }
  if (rule.dayMin) {
    chips.push({ label: `일수 ≥ ${rule.dayMin}`, className: 'border-indigo-200 bg-indigo-50 text-indigo-700' });
  }
  if (rule.dayMax) {
    chips.push({ label: `일수 ≤ ${rule.dayMax}`, className: 'border-indigo-200 bg-indigo-50 text-indigo-700' });
  }
  if (rule.vehicleType) {
    chips.push({ label: `차량 ${rule.vehicleType}`, className: 'border-amber-200 bg-amber-50 text-amber-700' });
  }
  if (rule.travelDateFrom) {
    chips.push({
      label: `기간 ≥ ${toDateInputValue(rule.travelDateFrom)}`,
      className: 'border-violet-200 bg-violet-50 text-violet-700',
    });
  }
  if (rule.travelDateTo) {
    chips.push({
      label: `기간 ≤ ${toDateInputValue(rule.travelDateTo)}`,
      className: 'border-violet-200 bg-violet-50 text-violet-700',
    });
  }
  if (rule.flightInTimeBand) {
    chips.push({
      label: `IN ${getOptionLabel(TIME_BAND_OPTIONS, rule.flightInTimeBand)}`,
      className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    });
  }
  if (rule.flightOutTimeBand) {
    chips.push({
      label: `OUT ${getOptionLabel(TIME_BAND_OPTIONS, rule.flightOutTimeBand)}`,
      className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    });
  }
  if (rule.pickupPlaceType) {
    chips.push({
      label: `픽업 ${getOptionLabel(PLACE_TYPE_OPTIONS, rule.pickupPlaceType)}`,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    });
  }
  if (rule.dropPlaceType) {
    chips.push({
      label: `드랍 ${getOptionLabel(PLACE_TYPE_OPTIONS, rule.dropPlaceType)}`,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    });
  }
  if (rule.externalTransferMode) {
    chips.push({
      label: `실투외 ${getOptionLabel(EXTERNAL_TRANSFER_MODE_OPTIONS, rule.externalTransferMode)}`,
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    });
  }
  if (rule.externalTransferMinCount) {
    chips.push({
      label: `실투외 건수 ≥ ${rule.externalTransferMinCount}`,
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    });
  }
  if (rule.externalTransferPresetCodes.length > 0) {
    chips.push({
      label: `프리셋 ${rule.externalTransferPresetCodes.map(getExternalTransferPresetLabel).join(', ')}`,
      className: 'border-pink-200 bg-pink-50 text-pink-700',
    });
  }
  if (rule.lodgingSelectionLevel) {
    chips.push({
      label: `숙소 ${getLodgingSelectionLevelLabel(rule.lodgingSelectionLevel)}`,
      className: 'border-orange-200 bg-orange-50 text-orange-700',
    });
  }
  if (rule.quantitySource === 'LONG_DISTANCE_SEGMENT_COUNT') {
    chips.push({
      label: '장거리 구간 수만큼 적용',
      className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    });
  }
  if (rule.quantitySource === 'NIGHT_TRAIN_BLOCK_COUNT') {
    chips.push({
      label: '야간열차 운행 수만큼 적용',
      className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    });
  }

  return chips;
}

export function PricingRulesTable({
  rules,
  onEdit,
  onDelete,
}: {
  rules: PricingRuleRow[];
  onEdit: (rule: PricingRuleRow) => void;
  onDelete: (rule: PricingRuleRow) => void;
}): JSX.Element {
  const groupedRules = useMemo(
    () =>
      (['BASE', 'AUTO', 'CONDITION', 'MANUAL'] as PricingPriceItemGroup[]).map((group) => ({
        group,
        rules: rules.filter((rule) => getPriceItemGroupForPreset(rule.priceItemPreset) === group),
      })),
    [rules],
  );
  const [selectedGroup, setSelectedGroup] = useState<PricingPriceItemGroup>('BASE');

  const selectedGroupRules = groupedRules.find(({ group }) => group === selectedGroup)?.rules ?? [];

  return (
    <div className="grid gap-5">
      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groupedRules.map(({ group, rules: groupRules }) => {
          const isSelected = selectedGroup === group;
          return (
            <div
              key={group}
              className={`flex min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                isSelected ? 'border-slate-900 ring-1 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                className={`min-w-0 flex-1 p-4 text-left transition ${
                  isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="text-sm font-semibold text-slate-900">{getPriceItemGroupLabel(group)}</div>
                <div className="mt-2 text-xs text-slate-600">
                  규칙 {groupRules.length}개
                  {groupRules.length > 0 ? ` · ${groupRules.slice(0, 2).map((rule) => rule.title).join(', ')}` : ''}
                </div>
              </button>
              <div className="flex w-[92px] shrink-0 flex-col items-stretch justify-center gap-2 border-l border-slate-100 bg-slate-50/80 p-2">
                <span
                  className={`mx-auto rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isSelected ? '선택됨' : '그룹'}
                </span>
                <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => setSelectedGroup(group)}>
                  보기
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
            {getPriceItemGroupLabel(selectedGroup)}
          </span>
          <span className="text-xs text-slate-500">{selectedGroupRules.length}개 규칙</span>
        </div>
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-0 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>제목</Th>
                <Th>세부 항목</Th>
                <Th>계산</Th>
                <Th>표시 기준</Th>
                <Th>조건</Th>
                <Th>상태</Th>
                <Th>작업</Th>
              </tr>
            </thead>
            <tbody>
              {selectedGroupRules.length === 0 ? (
                <tr className="border-t border-slate-200">
                  <Td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                    등록된 규칙이 없습니다.
                  </Td>
                </tr>
              ) : (
                selectedGroupRules.map((rule) => {
                  const conditionChips = getConditionChips(rule);
                  const displayPreview = getPricingDisplayPreview(rule);
                  const optionLabel = getPriceItemOptionLabel(getSelectedPriceItemOption(toRuleForm(rule)));
                  return (
                    <tr key={rule.id} className="border-t border-slate-200">
                      <Td className="max-w-[14rem] align-middle font-medium text-slate-900">{rule.title}</Td>
                      <Td className="align-middle">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                          {rule.priceItemPreset === 'CONDITIONAL' ? optionLabel : getPriceItemPresetLabel(rule.priceItemPreset)}
                        </span>
                      </Td>
                      <Td>{formatCalculationLabel(rule)}</Td>
                      <Td className="align-middle">
                        <div className="grid gap-0.5">
                          <span className="font-medium text-slate-900">{displayPreview.label}</span>
                          {displayPreview.example ? (
                            <span className="text-xs text-slate-500">{displayPreview.example}</span>
                          ) : null}
                        </div>
                      </Td>
                      <Td>
                        {conditionChips.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {conditionChips.map((chip) => (
                              <span
                                key={chip.label}
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${chip.className}`}
                              >
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            rule.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {rule.isEnabled ? '활성' : '비활성'}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => onEdit(rule)}>
                            수정
                          </Button>
                          <Button variant="outline" onClick={() => onDelete(rule)}>
                            삭제
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
