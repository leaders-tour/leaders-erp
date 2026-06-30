import { z } from 'zod';

export const PLAN_VEHICLE_TYPES = [
  '스타렉스',
  '푸르공',
  '벨파이어',
  '하이에이스',
  '프리미엄 밴',
  'SUV',
  '카운티',
] as const;

export type PlanVehicleType = (typeof PLAN_VEHICLE_TYPES)[number];

export const vehicleAssignmentSchema = z.object({
  vehicleType: z.enum(PLAN_VEHICLE_TYPES),
  count: z.number().int().min(1).max(10),
});

export type VehicleAssignment = z.infer<typeof vehicleAssignmentSchema>;

export const vehicleAssignmentsSchema = z.array(vehicleAssignmentSchema).min(1).max(10);

export const HIACE_VEHICLE_TYPE: PlanVehicleType = '하이에이스';
export const HIACE_VEHICLE_HEADCOUNT_MIN = 2;

function isPlanVehicleType(value: unknown): value is PlanVehicleType {
  return typeof value === 'string' && (PLAN_VEHICLE_TYPES as readonly string[]).includes(value);
}

/** DB/입력 JSON → 정규화된 배정 배열. fallback은 legacy vehicleType 단일값. */
export function normalizeVehicleAssignments(
  raw: unknown,
  fallbackVehicleType?: string | null,
): VehicleAssignment[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const parsed = vehicleAssignmentsSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
  }
  const fallback: PlanVehicleType =
    typeof fallbackVehicleType === 'string' && isPlanVehicleType(fallbackVehicleType.trim())
      ? (fallbackVehicleType.trim() as PlanVehicleType)
      : '스타렉스';
  return [{ vehicleType: fallback, count: 1 }];
}

/** legacy vehicleType 필드 동기화 — 첫 배정 줄 차종 */
export function primaryVehicleTypeFromAssignments(assignments: VehicleAssignment[]): PlanVehicleType {
  return assignments[0]?.vehicleType ?? '스타렉스';
}

/** 견적서·확정서 차량 셀 표기: "카운티 2대", "하이에이스 1대, 스타렉스 1대" */
export function formatVehicleAssignmentsForDisplay(assignments: VehicleAssignment[]): string {
  if (assignments.length === 0) {
    return '-';
  }
  return assignments
    .map(({ vehicleType, count }) => (count === 1 ? `${vehicleType} 1대` : `${vehicleType} ${count}대`))
    .join(', ');
}

export function totalVehicleCount(assignments: VehicleAssignment[]): number {
  return assignments.reduce((sum, row) => sum + row.count, 0);
}

export function hasHiaceAssignment(assignments: VehicleAssignment[]): boolean {
  return assignments.some((row) => row.vehicleType === HIACE_VEHICLE_TYPE);
}

export function validateHiaceHeadcountForAssignments(
  assignments: VehicleAssignment[],
  headcountTotal: number,
): string | null {
  if (hasHiaceAssignment(assignments) && headcountTotal < HIACE_VEHICLE_HEADCOUNT_MIN) {
    return '하이에이스 차량은 2인 이상부터 선택할 수 있습니다.';
  }
  return null;
}

/** pricing/API 입력용 — vehicleAssignments 없으면 vehicleType 단일로 1대 */
export function resolveVehicleAssignmentsForPricing(input: {
  vehicleAssignments?: unknown;
  vehicleType?: string | null;
}): VehicleAssignment[] {
  return normalizeVehicleAssignments(input.vehicleAssignments, input.vehicleType);
}
