import { describe, expect, it } from 'vitest';
import {
  APP_SETTINGS_DEFAULT,
  DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
  appSettingsPayloadSchema,
  collectFlightTimeSettingsIssues,
  DEFAULT_FLIGHT_TIME_AUTO_IN,
  DEFAULT_FLIGHT_TIME_AUTO_OUT,
  evaluateRentalItemQuantityFormula,
  normalizeAppSettingsPayload,
  normalizeFlightTimeSettings,
  pickClosestFlightTime,
  renderRentalItemPresetText,
  validateRentalItemSharedQuantityRules,
} from './app-settings.schema';

describe('app settings schema', () => {
  it('accepts valid movement intensity HEX colors', () => {
    const result = appSettingsPayloadSchema.safeParse({
      movementIntensityColors: [
        { level: 'LEVEL_1', color: '#ABCDEF' },
        { level: 'LEVEL_2', color: '#ffcd4a' },
        { level: 'LEVEL_3', color: '#fd9f28' },
        { level: 'LEVEL_4', color: '#fc5230' },
        { level: 'LEVEL_5', color: '#111111' },
      ],
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
      tourListRentalItemStock: APP_SETTINGS_DEFAULT.tourListRentalItemStock,
      flightTimeSettings: APP_SETTINGS_DEFAULT.flightTimeSettings,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.movementIntensityColors[0]?.color).toBe('#abcdef');
    }
  });

  it('rejects invalid HEX colors', () => {
    const result = appSettingsPayloadSchema.safeParse({
      movementIntensityColors: [{ level: 'LEVEL_1', color: 'red' }],
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
      tourListRentalItemStock: APP_SETTINGS_DEFAULT.tourListRentalItemStock,
      flightTimeSettings: APP_SETTINGS_DEFAULT.flightTimeSettings,
    });

    expect(result.success).toBe(false);
  });

  it('fills missing levels with defaults', () => {
    const normalized = normalizeAppSettingsPayload({
      movementIntensityColors: [{ level: 'LEVEL_3', color: '#123456' }],
    });

    expect(normalized.movementIntensityColors).toHaveLength(5);
    expect(normalized.movementIntensityColors.find((item) => item.level === 'LEVEL_3')?.color).toBe('#123456');
    expect(normalized.movementIntensityColors.find((item) => item.level === 'LEVEL_1')?.color).toBe(
      APP_SETTINGS_DEFAULT.movementIntensityColors[0]?.color,
    );
  });

  it('renders the default rental item preset with the legacy text', () => {
    const preset = APP_SETTINGS_DEFAULT.rentalItemPresets[0]!;

    expect(renderRentalItemPresetText(preset, 6)).toBe(
      '판초 6개, 모기장 6개, 썰매 6개, 돗자리 2개, 별레이저 1개, 랜턴 1개, 멀티탭 2개, 드라이기 1개, 보드게임 1종, 버너/냄비/팬 1set',
    );
  });

  it('normalizes rental item presets to exactly one current preset', () => {
    const normalized = normalizeAppSettingsPayload({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: [
        {
          id: 'a',
          name: 'A',
          current: true,
          sharedQuantityRules: DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
          items: [{ id: 'a-1', label: 'A', unit: '개', quantityFormula: '1' }],
        },
        {
          id: 'b',
          name: 'B',
          current: true,
          sharedQuantityRules: DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
          items: [{ id: 'b-1', label: 'B', unit: '개', quantityFormula: '2' }],
        },
      ],
    });

    expect(normalized.rentalItemPresets.filter((preset) => preset.current)).toHaveLength(1);
    expect(normalized.rentalItemPresets[0]?.current).toBe(true);
    expect(normalized.rentalItemPresets[1]?.current).toBe(false);
  });

  it('sets the first rental item preset as current when none is current', () => {
    const normalized = normalizeAppSettingsPayload({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: [
        {
          id: 'a',
          name: 'A',
          current: false,
          sharedQuantityRules: DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
          items: [{ id: 'a-1', label: 'A', unit: '개', quantityFormula: '1' }],
        },
      ],
    });

    expect(normalized.rentalItemPresets[0]?.current).toBe(true);
  });

  it('evaluates allowed rental item formulas', () => {
    expect(evaluateRentalItemQuantityFormula('total >= 10 ? 4 : total >= 5 ? 2 : 1', 6)).toBe(2);
    expect(evaluateRentalItemQuantityFormula('ceil(total / 2)', 5)).toBe(3);
    expect(evaluateRentalItemQuantityFormula('max(shared, 3)', 6)).toBe(3);
    expect(evaluateRentalItemQuantityFormula('전체인원 >= 5 ? 공용수량 : 1', 6)).toBe(2);
    expect(evaluateRentalItemQuantityFormula('최대(공용수량, 올림(전체인원 / 3))', 6)).toBe(2);
  });

  it('normalizes legacy rental item presets with default shared rules', () => {
    const normalized = normalizeAppSettingsPayload({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: [
        {
          id: 'legacy',
          name: 'Legacy',
          current: true,
          items: [{ id: 'legacy-1', label: '돗자리', unit: '개', quantityFormula: 'shared' }],
        },
      ],
    });

    expect(normalized.rentalItemPresets[0]?.sharedQuantityRules).toEqual(DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES);
    expect(renderRentalItemPresetText(normalized.rentalItemPresets[0]!, 6)).toBe('돗자리 2개');
  });

  it('evaluates shared from preset-specific rules', () => {
    const preset = {
      ...APP_SETTINGS_DEFAULT.rentalItemPresets[0]!,
      sharedQuantityRules: [
        { id: 'custom-1-3', minHeadcount: 1, maxHeadcount: 3, quantity: 1 },
        { id: 'custom-4-plus', minHeadcount: 4, maxHeadcount: null, quantity: 9 },
      ],
    };

    expect(evaluateRentalItemQuantityFormula('shared', 6, preset)).toBe(9);
    expect(renderRentalItemPresetText({ ...preset, items: [{ id: 'x', label: '멀티탭', unit: '개', quantityFormula: 'shared' }] }, 6)).toBe(
      '멀티탭 9개',
    );
  });

  it('rejects invalid shared quantity rules', () => {
    expect(
      validateRentalItemSharedQuantityRules([
        { id: 'a', minHeadcount: 1, maxHeadcount: 5, quantity: 1 },
        { id: 'b', minHeadcount: 5, maxHeadcount: null, quantity: 2 },
      ]),
    ).toContain('5명 구간이 앞 구간과 겹칩니다.');

    expect(
      validateRentalItemSharedQuantityRules([
        { id: 'a', minHeadcount: 1, maxHeadcount: 3, quantity: 1 },
        { id: 'b', minHeadcount: 5, maxHeadcount: null, quantity: 2 },
      ]),
    ).toContain('4명 구간이 비어 있습니다.');

    expect(
      validateRentalItemSharedQuantityRules([
        { id: 'a', minHeadcount: 1, maxHeadcount: 3, quantity: 1 },
      ]),
    ).toContain('마지막 구간은 "이상"으로 설정해야 합니다.');
  });

  it('fills missing tour list rental stock with defaults', () => {
    const normalized = normalizeAppSettingsPayload({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
    });

    expect(normalized.tourListRentalItemStock).toEqual(APP_SETTINGS_DEFAULT.tourListRentalItemStock);
  });

  it('rejects invalid rental item formulas', () => {
    const result = appSettingsPayloadSchema.safeParse({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: [
        {
          id: 'bad',
          name: 'Bad',
          current: true,
          sharedQuantityRules: DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
          items: [{ id: 'bad-1', label: 'Bad', unit: '개', quantityFormula: 'total.includes(1)' }],
        },
      ],
      tourListRentalItemStock: APP_SETTINGS_DEFAULT.tourListRentalItemStock,
      flightTimeSettings: APP_SETTINGS_DEFAULT.flightTimeSettings,
    });

    expect(result.success).toBe(false);
  });

  it('fills missing flight time settings with defaults', () => {
    const normalized = normalizeAppSettingsPayload({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
    });

    expect(normalized.flightTimeSettings).toEqual(APP_SETTINGS_DEFAULT.flightTimeSettings);
  });

  it('preserves manual flight time shortcut order', () => {
    const normalized = normalizeFlightTimeSettings({
      inTimeShortcuts: ['23:30', '02:45', '00:05'],
      outTimeShortcuts: ['20:30', '18:15'],
      defaultInTime: '02:45',
      defaultOutTime: '18:15',
    });

    expect(normalized.inTimeShortcuts).toEqual(['23:30', '02:45', '00:05']);
    expect(normalized.outTimeShortcuts).toEqual(['20:30', '18:15']);
  });

  it('rejects duplicate flight time shortcuts', () => {
    const result = appSettingsPayloadSchema.safeParse({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
      tourListRentalItemStock: APP_SETTINGS_DEFAULT.tourListRentalItemStock,
      flightTimeSettings: {
        inTimeShortcuts: ['02:45', '02:45'],
        outTimeShortcuts: APP_SETTINGS_DEFAULT.flightTimeSettings.outTimeShortcuts,
        defaultInTime: '02:45',
        defaultOutTime: DEFAULT_FLIGHT_TIME_AUTO_OUT,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects default flight time not included in shortcuts', () => {
    const issues = collectFlightTimeSettingsIssues({
      inTimeShortcuts: ['00:05'],
      outTimeShortcuts: ['18:15'],
      defaultInTime: '02:45',
      defaultOutTime: '18:15',
    });

    expect(issues).toContain('자동 IN 초기값은 IN 단축키 목록에 포함되어야 합니다.');
  });

  it('picks the closest configured flight time', () => {
    expect(
      pickClosestFlightTime(['02:45', '13:20'], '04:30', DEFAULT_FLIGHT_TIME_AUTO_IN),
    ).toBe('02:45');
  });
});
