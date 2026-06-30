import type { PlanVehicleType, VehicleAssignment } from '@tour/validation';

export const HIACE_AUTO_VEHICLE_HEADCOUNT_MIN = 8;
export const HIACE_VEHICLE_HEADCOUNT_MIN = 2;

export function resolveVehicleTypeForHeadcount(
  headcountTotal: number,
  currentVehicle: string,
  vehicles: readonly string[],
): string {
  if (headcountTotal >= HIACE_AUTO_VEHICLE_HEADCOUNT_MIN) {
    return '하이에이스';
  }

  if (currentVehicle === '하이에이스' && headcountTotal < HIACE_VEHICLE_HEADCOUNT_MIN) {
    return vehicles.includes('스타렉스') ? '스타렉스' : (vehicles[0] ?? currentVehicle);
  }

  return currentVehicle;
}

/** 인원 변경 시 첫 배정 줄 차종만 자동 조정 */
export function resolveVehicleAssignmentsForHeadcount(
  headcountTotal: number,
  assignments: VehicleAssignment[],
  vehicles: readonly string[],
): VehicleAssignment[] {
  if (assignments.length === 0) {
    const fallbackType = resolveVehicleTypeForHeadcount(headcountTotal, '스타렉스', vehicles);
    return [{ vehicleType: fallbackType as PlanVehicleType, count: 1 }];
  }
  const first = assignments[0]!;
  const rest = assignments.slice(1);
  const nextType = resolveVehicleTypeForHeadcount(headcountTotal, first.vehicleType, vehicles);
  return [{ vehicleType: nextType as PlanVehicleType, count: first.count }, ...rest];
}
