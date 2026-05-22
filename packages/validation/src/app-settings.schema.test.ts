import { describe, expect, it } from 'vitest';
import {
  APP_SETTINGS_DEFAULT,
  appSettingsPayloadSchema,
  normalizeAppSettingsPayload,
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
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.movementIntensityColors[0]?.color).toBe('#abcdef');
    }
  });

  it('rejects invalid HEX colors', () => {
    const result = appSettingsPayloadSchema.safeParse({
      movementIntensityColors: [{ level: 'LEVEL_1', color: 'red' }],
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
});
