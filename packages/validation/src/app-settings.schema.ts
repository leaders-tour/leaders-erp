import { z } from 'zod';

export const movementIntensityLevels = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'] as const;

export const appSettingKeySchema = z.enum(['appearance']);

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'HEX color must be #RRGGBB');

export const movementIntensityColorSchema = z.object({
  level: z.enum(movementIntensityLevels),
  color: hexColorSchema.transform((value) => value.toLowerCase()),
});

export const appSettingsPayloadSchema = z.object({
  movementIntensityColors: z.array(movementIntensityColorSchema),
});

export type AppSettingKey = z.infer<typeof appSettingKeySchema>;
export type MovementIntensityLevel = z.infer<typeof movementIntensityColorSchema>['level'];
export type MovementIntensityColor = z.infer<typeof movementIntensityColorSchema>;
export type AppSettingsPayload = z.infer<typeof appSettingsPayloadSchema>;

export const APP_SETTINGS_KEY_APPEARANCE: AppSettingKey = 'appearance';

export const DEFAULT_MOVEMENT_INTENSITY_COLORS: MovementIntensityColor[] = [
  { level: 'LEVEL_1', color: '#8bb058' },
  { level: 'LEVEL_2', color: '#ffcd4a' },
  { level: 'LEVEL_3', color: '#fd9f28' },
  { level: 'LEVEL_4', color: '#fc5230' },
  { level: 'LEVEL_5', color: '#111111' },
];

export const APP_SETTINGS_DEFAULT: AppSettingsPayload = {
  movementIntensityColors: DEFAULT_MOVEMENT_INTENSITY_COLORS,
};

export function normalizeAppSettingsPayload(value: unknown): AppSettingsPayload {
  const parsed = appSettingsPayloadSchema.partial().safeParse(value);
  if (!parsed.success) {
    return APP_SETTINGS_DEFAULT;
  }

  const colorByLevel = new Map<MovementIntensityLevel, string>();
  for (const item of parsed.data.movementIntensityColors ?? []) {
    colorByLevel.set(item.level, item.color);
  }

  return {
    movementIntensityColors: DEFAULT_MOVEMENT_INTENSITY_COLORS.map((item) => ({
      level: item.level,
      color: colorByLevel.get(item.level) ?? item.color,
    })),
  };
}

export function parseAppSettingsPayload(value: unknown): AppSettingsPayload {
  return appSettingsPayloadSchema.parse(normalizeAppSettingsPayload(value));
}
