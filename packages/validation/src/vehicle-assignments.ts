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

export const CUSTOM_VEHICLE_TYPE = 'CUSTOM' as const;
export const CUSTOM_VEHICLE_TYPE_LABEL = '직접입력';

export const ASSIGNMENT_VEHICLE_TYPES = [...PLAN_VEHICLE_TYPES, CUSTOM_VEHICLE_TYPE] as const;
export type AssignmentVehicleType = (typeof ASSIGNMENT_VEHICLE_TYPES)[number];

export const vehicleAssignmentSchema = z
  .object({
    vehicleType: z.enum(ASSIGNMENT_VEHICLE_TYPES),
    vehicleTypeCustomText: z.string().max(100).optional(),
    count: z.number().int().min(1).max(10),
  })
  .superRefine((value, ctx) => {
    if (value.vehicleType !== CUSTOM_VEHICLE_TYPE) {
      return;
    }

    const text = value.vehicleTypeCustomText?.trim() ?? '';
    if (text.length > 0) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'vehicleTypeCustomText is required when vehicleType is CUSTOM',
      path: ['vehicleTypeCustomText'],
    });
  });

export type VehicleAssignment = z.infer<typeof vehicleAssignmentSchema>;

export const vehicleAssignmentsSchema = z.array(vehicleAssignmentSchema).min(1).max(10);

export const HIACE_VEHICLE_TYPE: PlanVehicleType = '하이에이스';
export const HIACE_VEHICLE_HEADCOUNT_MIN = 2;

function isPlanVehicleType(value: unknown): value is PlanVehicleType {
  return typeof value === 'string' && (PLAN_VEHICLE_TYPES as readonly string[]).includes(value);
}

export function resolveVehicleAssignmentLabel(assignment: VehicleAssignment): string {
  if (assignment.vehicleType === CUSTOM_VEHICLE_TYPE) {
    return assignment.vehicleTypeCustomText?.trim() || CUSTOM_VEHICLE_TYPE_LABEL;
  }
  return assignment.vehicleType;
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

  const trimmedFallback = fallbackVehicleType?.trim() ?? '';
  if (trimmedFallback.length > 0 && isPlanVehicleType(trimmedFallback)) {
    return [{ vehicleType: trimmedFallback, count: 1 }];
  }
  if (trimmedFallback.length > 0) {
    return [{ vehicleType: CUSTOM_VEHICLE_TYPE, vehicleTypeCustomText: trimmedFallback, count: 1 }];
  }

  return [{ vehicleType: '스타렉스', count: 1 }];
}

/** legacy vehicleType 필드 동기화 — 첫 배정 줄 차종 */
export function primaryVehicleTypeFromAssignments(assignments: VehicleAssignment[]): AssignmentVehicleType {
  return assignments[0]?.vehicleType ?? '스타렉스';
}

/** 견적서·확정서 차량 셀 표기: "카운티 2대", "45인승 버스 1대" */
export function formatVehicleAssignmentsForDisplay(assignments: VehicleAssignment[]): string {
  if (assignments.length === 0) {
    return '-';
  }
  return assignments
    .map((assignment) => {
      const label = resolveVehicleAssignmentLabel(assignment);
      const { count } = assignment;
      return count === 1 ? `${label} 1대` : `${label} ${count}대`;
    })
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

export function validateVehicleAssignmentCustomTexts(assignments: VehicleAssignment[]): string | null {
  for (const assignment of assignments) {
    if (assignment.vehicleType === CUSTOM_VEHICLE_TYPE && !(assignment.vehicleTypeCustomText?.trim())) {
      return '직접입력 차종의 차종명을 입력해주세요.';
    }
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
