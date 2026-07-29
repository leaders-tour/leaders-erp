import type { PlanVehicleType, VehicleAssignment } from '@tour/validation';
import { CUSTOM_VEHICLE_TYPE } from '@tour/validation';

export const HIACE_AUTO_VEHICLE_HEADCOUNT_MIN = 7;
export const STAREX_AUTO_VEHICLE_HEADCOUNT_MAX = 6;
export const HIACE_VEHICLE_HEADCOUNT_MIN = 2;

function defaultVehicleType(vehicles: readonly string[], fallback: string): string {
  return vehicles.includes('스타렉스') ? '스타렉스' : (vehicles[0] ?? fallback);
}

export function resolveVehicleTypeForHeadcount(
  headcountTotal: number,
  currentVehicle: string,
  vehicles: readonly string[],
  previousHeadcount?: number,
): string {
  if (headcountTotal >= HIACE_AUTO_VEHICLE_HEADCOUNT_MIN) {
    return '하이에이스';
  }

  if (currentVehicle === '하이에이스' && headcountTotal < HIACE_VEHICLE_HEADCOUNT_MIN) {
    return defaultVehicleType(vehicles, currentVehicle);
  }

  if (
    currentVehicle === '하이에이스' &&
    headcountTotal <= STAREX_AUTO_VEHICLE_HEADCOUNT_MAX &&
    previousHeadcount !== undefined &&
    previousHeadcount >= HIACE_AUTO_VEHICLE_HEADCOUNT_MIN
  ) {
    return defaultVehicleType(vehicles, currentVehicle);
  }

  return currentVehicle;
}

/** 인원 변경 시 첫 배정 줄 차종만 자동 조정 */
export function resolveVehicleAssignmentsForHeadcount(
  headcountTotal: number,
  assignments: VehicleAssignment[],
  vehicles: readonly string[],
  previousHeadcount?: number,
): VehicleAssignment[] {
  if (assignments.length === 0) {
    const fallbackType = resolveVehicleTypeForHeadcount(headcountTotal, '스타렉스', vehicles, previousHeadcount);
    return [{ vehicleType: fallbackType as PlanVehicleType, count: 1 }];
  }
  const first = assignments[0]!;
  if (first.vehicleType === CUSTOM_VEHICLE_TYPE) {
    return assignments;
  }
  const rest = assignments.slice(1);
  const nextType = resolveVehicleTypeForHeadcount(
    headcountTotal,
    first.vehicleType,
    vehicles,
    previousHeadcount,
  );
  return [{ vehicleType: nextType as PlanVehicleType, count: first.count }, ...rest];
}
