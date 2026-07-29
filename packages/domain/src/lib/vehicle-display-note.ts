export const VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO = '*푸르공 사진촬영 가능';

export function vehicleTypeShowsPurgongPhotoNote(vehicleType: string | null | undefined): boolean {
  const normalized = vehicleType?.trim() ?? '';
  return normalized.includes('스타렉스') || normalized.includes('하이에이스');
}

/** 저장값이 없을 때 스타렉스/하이에이스면 기본 보조 문구를 사용한다. */
export function resolveVehicleDisplayNote(
  vehicleTypeDisplay: string | null | undefined,
  storedNote: string | null | undefined,
): string | null {
  const trimmedStored = storedNote?.trim();
  if (trimmedStored) {
    return trimmedStored;
  }
  if (vehicleTypeShowsPurgongPhotoNote(vehicleTypeDisplay)) {
    return VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO;
  }
  return null;
}

/** 차량 변경 시 자동 문구를 채우거나(스타렉스/하이에이스), 기본 문구만 있을 때 비운다. */
export function syncVehicleDisplayNoteForVehicleType(
  vehicleTypeDisplay: string | null | undefined,
  currentNote: string,
): string {
  const shouldAuto = vehicleTypeShowsPurgongPhotoNote(vehicleTypeDisplay);
  const trimmed = currentNote.trim();
  const isAutoManaged = trimmed === '' || trimmed === VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO;

  if (shouldAuto && isAutoManaged) {
    return VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO;
  }
  if (!shouldAuto && trimmed === VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO) {
    return '';
  }
  return currentNote;
}
