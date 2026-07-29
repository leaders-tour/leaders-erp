import { describe, expect, it } from 'vitest';
import {
  resolveVehicleDisplayNote,
  syncVehicleDisplayNoteForVehicleType,
  VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO,
} from './vehicle-display-note';

describe('vehicle display note', () => {
  it('auto-fills purgong photo note for 스타렉스/하이에이스 when stored note is empty', () => {
    expect(resolveVehicleDisplayNote('스타렉스 1대', null)).toBe(VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO);
    expect(resolveVehicleDisplayNote('하이에이스 1대', '')).toBe(VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO);
    expect(resolveVehicleDisplayNote('푸르공 1대', null)).toBeNull();
  });

  it('keeps manual note when provided', () => {
    expect(resolveVehicleDisplayNote('스타렉스 1대', '직접 입력')).toBe('직접 입력');
  });

  it('syncs note on vehicle type changes without overwriting custom text', () => {
    expect(syncVehicleDisplayNoteForVehicleType('스타렉스 1대', '')).toBe(
      VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO,
    );
    expect(syncVehicleDisplayNoteForVehicleType('푸르공 1대', VEHICLE_DISPLAY_NOTE_PURGONG_PHOTO)).toBe('');
    expect(syncVehicleDisplayNoteForVehicleType('스타렉스 1대', '커스텀 문구')).toBe('커스텀 문구');
  });
});
