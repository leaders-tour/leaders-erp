import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { APP_SETTINGS_DEFAULT, APP_SETTINGS_KEY_APPEARANCE } from '@tour/validation';
import { AppSettingsService } from './app-settings.service';

function createPrismaMock(initialRow: { payload: unknown; updatedAt: Date } | null = null): PrismaClient {
  type AppSettingMockRow = { key: string; payload: unknown; updatedAt: Date };
  let row: AppSettingMockRow | null = initialRow ? { key: APP_SETTINGS_KEY_APPEARANCE, ...initialRow } : null;
  return {
    appSetting: {
      findUnique: async () => row,
      create: async ({ data }: { data: { key: string; payload: unknown } }) => {
        row = { key: data.key, payload: data.payload, updatedAt: new Date('2026-05-22T00:00:00.000Z') };
        return row;
      },
      upsert: async ({ create, update }: { create: { key: string; payload: unknown }; update: { payload: unknown } }) => {
        row = row
          ? { ...row, payload: update.payload, updatedAt: new Date('2026-05-22T01:00:00.000Z') }
          : { key: create.key, payload: create.payload, updatedAt: new Date('2026-05-22T01:00:00.000Z') };
        return row;
      },
    },
  } as unknown as PrismaClient;
}

describe('AppSettingsService', () => {
  it('creates and returns default settings when the row is missing', async () => {
    const service = new AppSettingsService(createPrismaMock());

    const result = await service.get();

    expect(result.movementIntensityColors).toEqual(APP_SETTINGS_DEFAULT.movementIntensityColors);
  });

  it('normalizes missing movement intensity levels on update', async () => {
    const service = new AppSettingsService(createPrismaMock());

    const result = await service.update({
      movementIntensityColors: [{ level: 'LEVEL_3', color: '#123456' }],
    });

    expect(result.movementIntensityColors).toHaveLength(5);
    expect(result.movementIntensityColors.find((item) => item.level === 'LEVEL_3')?.color).toBe('#123456');
    expect(result.movementIntensityColors.find((item) => item.level === 'LEVEL_1')?.color).toBe(
      APP_SETTINGS_DEFAULT.movementIntensityColors[0]?.color,
    );
  });

  it('rejects invalid colors', async () => {
    const service = new AppSettingsService(createPrismaMock());

    await expect(
      service.update({
        movementIntensityColors: [{ level: 'LEVEL_1', color: 'red' }],
      }),
    ).rejects.toThrow('앱 설정 입력이 올바르지 않습니다.');
  });
});
