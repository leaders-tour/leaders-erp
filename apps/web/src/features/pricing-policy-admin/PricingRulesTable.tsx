import { Button, Table, Td, Th } from '@tour/ui';
import { getExternalTransferPresetLabel, getPricingRuleTypeLabelKo } from './constants';
import type { PricingRuleRow } from './types';
import { toDateInputValue } from './utils';

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
          {rules.map((rule) => (
            <tr key={rule.id} className="border-t border-slate-200">
              <Td className="max-w-[14rem] align-middle font-medium text-slate-900">{rule.title}</Td>
              <Td className="align-middle">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                  {getPricingRuleTypeLabelKo(rule.ruleType)}
                </span>
              </Td>
              <Td>
                {rule.ruleType === 'PERCENT_UPLIFT'
                  ? `기본금의 ${(rule.percentBps ?? 0) / 100}%`
                  : `${rule.amountKrw ?? 0}원 / ${rule.quantitySource}`}
              </Td>
              <Td>
                {rule.customDisplayText
                  ? `커스텀: ${rule.customDisplayText}`
                  : rule.chargeScope === 'TEAM'
                    ? '팀당'
                    : rule.chargeScope === 'PER_PERSON'
                      ? rule.personMode || '인당'
                      : '-'}
              </Td>
              <Td>
                {[
                  rule.headcountMin ? `인원 ${rule.headcountMin}+` : null,
                  rule.headcountMax ? `인원 ~${rule.headcountMax}` : null,
                  rule.dayMin ? `일수 ${rule.dayMin}+` : null,
                  rule.dayMax ? `일수 ~${rule.dayMax}` : null,
                  rule.vehicleType ? `차량 ${rule.vehicleType}` : null,
                  rule.travelDateFrom ? `기간 ${toDateInputValue(rule.travelDateFrom)}~` : null,
                  rule.travelDateTo ? `기간 ~${toDateInputValue(rule.travelDateTo)}` : null,
                  rule.flightInTimeBand ? `IN ${rule.flightInTimeBand}` : null,
                  rule.flightOutTimeBand ? `OUT ${rule.flightOutTimeBand}` : null,
                  rule.pickupPlaceType ? `픽업 ${rule.pickupPlaceType}` : null,
                  rule.dropPlaceType ? `드랍 ${rule.dropPlaceType}` : null,
                  rule.externalTransferMode ? `실투외 ${rule.externalTransferMode}` : null,
                  rule.externalTransferMinCount ? `실투외 ${rule.externalTransferMinCount}건+` : null,
                  rule.externalTransferPresetCodes.length > 0
                    ? `프리셋 ${rule.externalTransferPresetCodes.map(getExternalTransferPresetLabel).join(', ')}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' / ') || '-'}
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
          ))}
        </tbody>
      </Table>
    </div>
  );
}
