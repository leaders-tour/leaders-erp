export const HIACE_AUTO_VEHICLE_HEADCOUNT_MIN = 8;
export const STAREX_AUTO_VEHICLE_HEADCOUNT_MAX = 6;

export function resolveVehicleTypeForHeadcount(
  headcountTotal: number,
  currentVehicle: string,
  vehicles: readonly string[],
): string {
  if (headcountTotal >= HIACE_AUTO_VEHICLE_HEADCOUNT_MIN) {
    return '하이에이스';
  }

  if (currentVehicle === '하이에이스' && headcountTotal <= STAREX_AUTO_VEHICLE_HEADCOUNT_MAX) {
    return vehicles.includes('스타렉스') ? '스타렉스' : (vehicles[0] ?? currentVehicle);
  }

  return currentVehicle;
}
