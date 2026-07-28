/** 해당 일차에 숙소 업그레이드·추가 설정이 가능한지 (마지막 여행일은 숙박하지 않음) */
export function isLodgingSettingDay(dayIndex: number, totalDays: number): boolean {
  return dayIndex >= 1 && dayIndex < totalDays;
}

/** extraLodgingCounts 배열 인덱스(0-based) 기준 */
export function isLodgingSettingDayIndex(dayIndexZeroBased: number, totalDays: number): boolean {
  return isLodgingSettingDay(dayIndexZeroBased + 1, totalDays);
}
