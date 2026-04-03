import { Button, Table, Td, Th } from '@tour/ui';
import {
  EXTERNAL_TRANSFER_MODE_OPTIONS,
  PLACE_TYPE_OPTIONS,
  TIME_BAND_OPTIONS,
  getExternalTransferPresetLabel,
  getLodgingSelectionLevelLabel,
  getPricingQuantitySourceLabelKo,
  getPricingRuleTypeLabelKo,
} from './constants';
import type { PricingRuleRow } from './types';
import { getPricingDisplayPreview, toDateInputValue } from './utils';

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
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-0 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>제목</Th>
            <Th>분류</Th>
            <Th>계산</Th>
            <Th>표시 기준</Th>
            <Th>조건</Th>
            <Th>상태</Th>
            <Th>작업</Th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => {
            const conditionChips = getConditionChips(rule);
            const displayPreview = getPricingDisplayPreview(rule);
            return (
              <tr key={rule.id} className="border-t border-slate-200">
                <Td className="max-w-[14rem] align-middle font-medium text-slate-900">{rule.title}</Td>
                <Td className="align-middle">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                    {getPricingRuleTypeLabelKo(rule.ruleType)}
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
          })}
        </tbody>
      </Table>
    </div>
  );
}
