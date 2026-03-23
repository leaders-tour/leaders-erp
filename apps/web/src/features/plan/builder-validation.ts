import { useMemo } from 'react';
import type { ExternalTransfer } from './external-transfer';
import { isExternalTransferComplete } from './external-transfer';
import { parseTimeToMinutes } from './pickup-drop';
import {
  getAssignmentsFromPlanRows,
  getShabushabuAllowedCandidates,
  isSamgyeopsalRecommended,
  SPECIAL_MEAL_KINDS,
  type SpecialMealRowContext,
} from './special-meals';
import type { MultiDayBlockConnectionOption } from '../plan-template/route-autofill';
import type { RouteSelection, SegmentOption } from '../plan-template/route-autofill';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationResult {
  id: string;
  severity: ValidationSeverity;
  message: string;
  affectedCells?: Array< { rowIndex: number; field: string }>;
}

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface MealCellFields {
  breakfast: string;
  lunch: string;
  dinner: string;
}

function extractLastTimeFromCellText(timeCellText: string | null | undefined): string | null {
  const text = timeCellText?.trim() ?? '';
  if (!text) return null;
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && line !== '-' && HH_MM_PATTERN.test(line)) {
      return line;
    }
  }
  return null;
}

function parseMealCellText(value: string | null | undefined): MealCellFields {
  const result: MealCellFields = {
    breakfast: '',
    lunch: '',
    dinner: '',
  };
  const text = value?.trim() ?? '';
  if (!text || text === '-') {
    return result;
  }

  const unlabeled: string[] = [];
  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    const breakfastMatch = /^아침\s*(.*)$/.exec(trimmed);
    if (breakfastMatch) {
      result.breakfast = breakfastMatch[1]?.trim() ?? '';
      return;
    }
    const lunchMatch = /^점심\s*(.*)$/.exec(trimmed);
    if (lunchMatch) {
      result.lunch = lunchMatch[1]?.trim() ?? '';
      return;
    }
    const dinnerMatch = /^저녁\s*(.*)$/.exec(trimmed);
    if (dinnerMatch) {
      result.dinner = dinnerMatch[1]?.trim() ?? '';
      return;
    }
    unlabeled.push(trimmed);
  });

  if (!result.breakfast && unlabeled[0]) {
    result.breakfast = unlabeled[0];
  }
  if (!result.lunch && unlabeled[1]) {
    result.lunch = unlabeled[1];
  }
  if (!result.dinner && unlabeled[2]) {
    result.dinner = unlabeled[2];
  }

  return result;
}

function getRequiredXMeals(input: {
  travelEndDate: string;
  dropDate: string;
  dropTime: string;
}): Array<keyof MealCellFields> {
  const { travelEndDate, dropDate, dropTime } = input;
  const minutes = parseTimeToMinutes(dropTime);
  if (minutes === null) {
    return [];
  }

  if (travelEndDate && dropDate && dropDate > travelEndDate) {
    return [];
  }

  if (minutes < 11 * 60) {
    return ['breakfast', 'lunch', 'dinner'];
  }
  if (minutes < 14 * 60) {
    return ['lunch', 'dinner'];
  }
  if (minutes < 19 * 60) {
    return ['dinner'];
  }

  return [];
}

export interface PlanRowForValidation {
  timeCellText: string;
  mealCellText: string;
  scheduleCellText: string;
  /** 특식 규칙 검증(샤브샤브 지역 등)용, 있으면 사용 */
  destinationCellText?: string | null;
}

export interface TransportGroupForValidation {
  teamName: string;
  headcount: number;
  flightInDate: string | null | undefined;
  flightInTime: string;
  flightOutDate: string | null | undefined;
  flightOutTime: string;
  pickupDate: string | null | undefined;
  pickupTime: string;
  dropDate: string | null | undefined;
  dropTime: string;
  pickupPlaceType: string;
  dropPlaceType: string;
  pickupPlaceCustomText: string;
  dropPlaceCustomText: string;
}

export interface LodgingSelectionForValidation {
  level: string;
  customLodgingId?: string | null;
}

export interface ManualAdjustmentForValidation {
  description: string;
  amountKrw: string;
  kind: string;
}

export interface PricingPreviewForValidation {
  balanceAmountKrw: number;
}

export interface BuilderValidationInput {
  planRows: PlanRowForValidation[];
  selectedRoute: RouteSelection[];
  startLocationId: string | null;
  filteredSegments: SegmentOption[];
  filteredOvernightStayConnections: MultiDayBlockConnectionOption[];
  transportGroups: TransportGroupForValidation[];
  headcountTotal: number;
  headcountMale: number;
  vehicleType: string;
  travelStartDate: string;
  travelEndDate: string;
  manualAdjustments: ManualAdjustmentForValidation[];
  lodgingSelections: LodgingSelectionForValidation[];
  externalTransfers: ExternalTransfer[];
  hasEditedManualDeposit: boolean;
  manualDepositInput: string;
  pricingPreview: PricingPreviewForValidation | null;
}

export function useBuilderValidation(input: BuilderValidationInput): ValidationResult[] {
  return useMemo(() => {
    const results: ValidationResult[] = [];
    const {
      planRows,
      selectedRoute,
      startLocationId,
      filteredSegments,
      filteredOvernightStayConnections,
      transportGroups,
      headcountTotal,
      headcountMale,
      vehicleType,
      travelStartDate,
      travelEndDate,
      manualAdjustments,
      lodgingSelections,
      externalTransfers,
      hasEditedManualDeposit,
      manualDepositInput,
      pricingPreview,
    } = input;

    const headcountFemale = headcountTotal - headcountMale;

    // invalid-date-range (error)
    const hasValidDateRange = Boolean(travelStartDate && travelEndDate) && travelStartDate <= travelEndDate;
    if (!hasValidDateRange) {
      results.push({
        id: 'invalid-date-range',
        severity: 'error',
        message: '여행 시작일·종료일을 확인해주세요.',
      });
    }

    // invalid-headcount (error)
    const hasValidHeadcount =
      headcountTotal > 0 && headcountMale >= 0 && headcountFemale >= 0 && headcountMale <= headcountTotal;
    if (!hasValidHeadcount) {
      results.push({
        id: 'invalid-headcount',
        severity: 'error',
        message: '인원수를 확인해주세요.',
      });
    }

    // hiace-headcount (error)
    if (vehicleType === '하이에이스' && headcountTotal < 3) {
      results.push({
        id: 'hiace-headcount',
        severity: 'error',
        message: '하이에이스는 3인 이상부터 선택 가능하며, 7인 이상은 추가금이 없습니다.',
      });
    }

    // invalid-transport-groups (error)
    const transportGroupHeadcountTotal = transportGroups.reduce((sum, g) => sum + g.headcount, 0);
    const hasInvalidTransportGroups =
      transportGroups.length === 0 ||
      transportGroups.some(
        (g) =>
          g.teamName.trim().length === 0 ||
          g.headcount < 1 ||
          !g.flightInDate ||
          !g.flightInTime.trim() ||
          !g.flightOutDate ||
          !g.flightOutTime.trim() ||
          !g.pickupDate ||
          !g.pickupTime.trim() ||
          !g.dropDate ||
          !g.dropTime.trim(),
      ) ||
      transportGroupHeadcountTotal !== headcountTotal;
    if (hasInvalidTransportGroups) {
      results.push({
        id: 'invalid-transport-groups',
        severity: 'error',
        message:
          '팀별 항공/픽업/드랍 세트의 팀명, 인원, 날짜/시간을 확인해주세요. 팀 인원 합계는 총 인원과 같아야 합니다.',
      });
    }

    // invalid-manual-adjustments (error)
    const hasInvalidManualAdjustments = manualAdjustments.some((item) => {
      const description = item.description.trim();
      const amountText = item.amountKrw.trim();
      if (description.length === 0 && amountText.length === 0) return false;
      return (
        description.length === 0 ||
        amountText.length === 0 ||
        !Number.isInteger(Number(item.amountKrw)) ||
        Number(item.amountKrw) < 0
      );
    });
    if (hasInvalidManualAdjustments) {
      results.push({
        id: 'invalid-manual-adjustments',
        severity: 'error',
        message: '기타금액 항목의 내용/금액을 확인해주세요.',
      });
    }

    // invalid-lodging-selections (error)
    const hasInvalidLodgingSelections = lodgingSelections.some(
      (item) => item.level === 'CUSTOM' && (!item.customLodgingId || item.customLodgingId.trim().length === 0),
    );
    if (hasInvalidLodgingSelections) {
      results.push({
        id: 'invalid-lodging-selections',
        severity: 'error',
        message: '커스텀 숙소를 선택한 경우 숙소를 지정해주세요.',
      });
    }

    // invalid-manual-deposit (error)
    const hasInvalidManualDepositInput =
      hasEditedManualDeposit &&
      manualDepositInput.trim().length > 0 &&
      (!Number.isInteger(Number(manualDepositInput.trim())) || Number(manualDepositInput.trim()) < 0);
    if (hasInvalidManualDepositInput) {
      results.push({
        id: 'invalid-manual-deposit',
        severity: 'error',
        message: '예약금 수동 입력값을 확인해주세요.',
      });
    }

    // invalid-external-transfers (error)
    const hasInvalidExternalTransfers = externalTransfers.some((t) => !isExternalTransferComplete(t));
    if (hasInvalidExternalTransfers) {
      results.push({
        id: 'invalid-external-transfers',
        severity: 'error',
        message: '실투어 외 외부 이동 항목의 날짜, 시간, 장소, 팀 선택, 금액을 확인해주세요.',
      });
    }

    // missing-custom-place-text (error)
    const hasMissingCustomPlaceText = transportGroups.some(
      (g) =>
        (g.pickupPlaceType === 'CUSTOM' && g.pickupPlaceCustomText.trim().length === 0) ||
        (g.dropPlaceType === 'CUSTOM' && g.dropPlaceCustomText.trim().length === 0),
    );
    if (hasMissingCustomPlaceText) {
      results.push({
        id: 'missing-custom-place-text',
        severity: 'error',
        message: '직접입력 장소를 선택한 항목의 장소명을 입력해주세요.',
      });
    }

    // missing-segment (warning)
    const hasMissingSegment = selectedRoute.some((toStop, index) => {
      if (toStop.kind === 'MULTI_DAY_BLOCK') {
        const fromId = index === 0 ? startLocationId : selectedRoute[index - 1]?.locationId ?? '';
        return !filteredSegments.some(
          (seg) => seg.fromLocationId === fromId && seg.toLocationId === toStop.locationId,
        );
      }
      const previousStop = selectedRoute[index - 1];
      if (previousStop?.kind === 'MULTI_DAY_BLOCK') {
        return !filteredOvernightStayConnections.some(
          (conn) =>
            conn.fromMultiDayBlockId === previousStop.multiDayBlockId &&
            conn.toLocationId === toStop.locationId,
        );
      }
      const fromId = index === 0 ? startLocationId : selectedRoute[index - 1]?.locationId ?? '';
      return !filteredSegments.some(
        (seg) => seg.fromLocationId === fromId && seg.toLocationId === toStop.locationId,
      );
    });
    if (hasMissingSegment) {
      results.push({
        id: 'missing-segment',
        severity: 'warning',
        message: '일부 구간 템플릿이 없습니다. Segment 데이터를 보강해주세요.',
      });
    }

    // balance-rounding (error) — 잔금에 1,000원 단위가 남으면 안됨
    if (pricingPreview && pricingPreview.balanceAmountKrw % 10000 !== 0) {
      results.push({
        id: 'balance-rounding',
        severity: 'error',
        message: `잔금 ${pricingPreview.balanceAmountKrw.toLocaleString()}원에 1,000원 단위가 남아있습니다.`,
      });
    }

    // drop-time-after-schedule (error) — 드랍시간이 마지막 날 마지막 일정보다 이르면 안됨
    if (planRows.length > 0 && transportGroups[0]) {
      const lastRow = planRows[planRows.length - 1];
      const lastTimeInCell = extractLastTimeFromCellText(lastRow?.timeCellText);
      const dropTime = transportGroups[0].dropTime?.trim();
      const dropMinutes = parseTimeToMinutes(dropTime);
      const lastMinutes = parseTimeToMinutes(lastTimeInCell);
      if (dropTime && dropMinutes !== null && lastMinutes !== null && dropMinutes < lastMinutes) {
        results.push({
          id: 'drop-time-after-schedule',
          severity: 'error',
          message: `드랍시간(${dropTime})이 마지막 날 마지막 일정(${lastTimeInCell ?? ''})보다 이릅니다.`,
          affectedCells: [{ rowIndex: planRows.length - 1, field: 'timeCellText' }],
        });
      }
    }

    // 특식 4종 규칙 기반 검증
    const specialMealRows = planRows.map((r) => ({
      mealCellText: r.mealCellText,
      destinationCellText: r.destinationCellText,
      scheduleCellText: r.scheduleCellText,
    }));
    const rowContexts: SpecialMealRowContext[] = [];
    planRows.forEach((r, dayIndex) => {
      rowContexts.push(
        { dayIndex, mealSlot: 'breakfast', destinationCellText: r.destinationCellText, scheduleCellText: r.scheduleCellText },
        { dayIndex, mealSlot: 'lunch', destinationCellText: r.destinationCellText, scheduleCellText: r.scheduleCellText },
        { dayIndex, mealSlot: 'dinner', destinationCellText: r.destinationCellText, scheduleCellText: r.scheduleCellText },
      );
    });
    const assignments = getAssignmentsFromPlanRows(specialMealRows);
    const assignedKinds = new Set(assignments.map((a) => a.specialMeal));

    // missing-special-meals (warning) — 특식 4종 모두 배치 권장
    const missingMeals = SPECIAL_MEAL_KINDS.filter((k) => !assignedKinds.has(k));
    if (missingMeals.length > 0) {
      results.push({
        id: 'missing-special-meals',
        severity: 'warning',
        message: `특식 누락: ${missingMeals.join(', ')} (4종 모두 배치를 권장합니다)`,
      });
    }

    // shabushabu-invalid-placement (error) — 샤브샤브는 울란바토르가 드러나는 일차의 식사에만 가능
    const shabushabuAllowed = getShabushabuAllowedCandidates(rowContexts);
    const shabushabuAssignment = assignments.find((a) => a.specialMeal === '샤브샤브');
    if (shabushabuAssignment) {
      const allowed = shabushabuAllowed.some(
        (c) => c.dayIndex === shabushabuAssignment.dayIndex && c.mealSlot === shabushabuAssignment.mealSlot,
      );
      if (!allowed) {
        results.push({
          id: 'shabushabu-invalid-placement',
          severity: 'error',
          message: '샤브샤브는 울란바토르 지역 일정이 있는 날의 아침·점심·저녁 중 한 곳에 배치할 수 있습니다.',
          affectedCells: [{ rowIndex: shabushabuAssignment.dayIndex, field: 'mealCellText' }],
        });
      }
    }

    // samgyeopsal-recommendation-deviation (warning) — 삼겹살 추천지 이탈 시 warning만, 저장 차단 안 함
    const samgyeopsalAssignment = assignments.find((a) => a.specialMeal === '삼겹살파티');
    if (samgyeopsalAssignment) {
      const ctx = rowContexts.find(
        (c) => c.dayIndex === samgyeopsalAssignment.dayIndex && c.mealSlot === samgyeopsalAssignment.mealSlot,
      );
      if (ctx && !isSamgyeopsalRecommended(ctx)) {
        results.push({
          id: 'samgyeopsal-recommendation-deviation',
          severity: 'warning',
          message: '삼겹살파티는 지역별 추천지(바양작, 어르헝폭포, 홉스골 등)에 배치하는 것을 권장합니다.',
          affectedCells: [{ rowIndex: samgyeopsalAssignment.dayIndex, field: 'mealCellText' }],
        });
      }
    }

    // last-day-meal-x-rule (warning) — 드랍시간 기준으로 X 처리되어야 하는 식사 확인
    if (planRows.length > 0 && transportGroups[0]) {
      const lastRowIndex = planRows.length - 1;
      const lastRow = planRows[lastRowIndex];
      const requiredXMeals = getRequiredXMeals({
        travelEndDate,
        dropDate: transportGroups[0].dropDate?.trim() ?? '',
        dropTime: transportGroups[0].dropTime?.trim() ?? '',
      });
      if (requiredXMeals.length > 0) {
        const mealFields = parseMealCellText(lastRow?.mealCellText);
        const invalidMeals = requiredXMeals.filter((mealKey) => {
          const value = mealFields[mealKey].trim().toUpperCase();
          return value !== 'X';
        });
        if (invalidMeals.length > 0) {
          const labels = invalidMeals.map((mealKey) => {
            switch (mealKey) {
              case 'breakfast':
                return '아침';
              case 'lunch':
                return '점심';
              case 'dinner':
                return '저녁';
            }
          });
          results.push({
            id: 'last-day-meal-x-rule',
            severity: 'warning',
            message: `마지막 날 드랍시간 기준으로 ${labels.join(', ')} 식사는 X로 표시되어야 합니다.`,
            affectedCells: [{ rowIndex: lastRowIndex, field: 'mealCellText' }],
          });
        }
      }
    }

    return results;
  }, [
    input.planRows,
    input.selectedRoute,
    input.startLocationId,
    input.filteredSegments,
    input.filteredOvernightStayConnections,
    input.transportGroups,
    input.headcountTotal,
    input.headcountMale,
    input.vehicleType,
    input.travelStartDate,
    input.travelEndDate,
    input.manualAdjustments,
    input.lodgingSelections,
    input.externalTransfers,
    input.hasEditedManualDeposit,
    input.manualDepositInput,
    input.pricingPreview,
  ]);
}
