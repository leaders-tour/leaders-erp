export const HIACE_AUTO_VEHICLE_HEADCOUNT_MIN = 8;

export function resolveVehicleTypeForHeadcount(
  headcountTotal: number,
  currentVehicle: string,
  vehicles: readonly string[],
): string {
  if (headcountTotal >= HIACE_AUTO_VEHICLE_HEADCOUNT_MIN) {
    return '하이에이스';
  }

  if (currentVehicle === '하이에이스' && headcountTotal < 3) {
    return vehicles.includes('스타렉스') ? '스타렉스' : (vehicles[0] ?? currentVehicle);
  }

  return currentVehicle;
}
