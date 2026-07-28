import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { APP_SETTINGS_DEFAULT, APP_SETTINGS_KEY_APPEARANCE } from '@tour/validation';
import { AppSettingsService } from './app-settings.service';

const defaultStockInput = {
  tourListRentalItemStock: {
    drone: APP_SETTINGS_DEFAULT.tourListRentalItemStock.DRONE,
    starlink: APP_SETTINGS_DEFAULT.tourListRentalItemStock.STARLINK,
    powerbank: APP_SETTINGS_DEFAULT.tourListRentalItemStock.POWERBANK,
  },
};

const defaultFlightTimeInput = {
  flightTimeSettings: APP_SETTINGS_DEFAULT.flightTimeSettings,
};

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
    expect(result.rentalItemPresets).toEqual(APP_SETTINGS_DEFAULT.rentalItemPresets);
    expect(result.tourListRentalItemStock).toEqual(defaultStockInput.tourListRentalItemStock);
    expect(result.flightTimeSettings).toEqual(APP_SETTINGS_DEFAULT.flightTimeSettings);
  });

  it('normalizes missing movement intensity levels on update', async () => {
    const service = new AppSettingsService(createPrismaMock());

    const result = await service.update({
      movementIntensityColors: [{ level: 'LEVEL_3', color: '#123456' }],
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
      ...defaultStockInput,
      ...defaultFlightTimeInput,
    });

    expect(result.movementIntensityColors).toHaveLength(5);
    expect(result.movementIntensityColors.find((item) => item.level === 'LEVEL_3')?.color).toBe('#123456');
    expect(result.movementIntensityColors.find((item) => item.level === 'LEVEL_1')?.color).toBe(
      APP_SETTINGS_DEFAULT.movementIntensityColors[0]?.color,
    );
    expect(result.rentalItemPresets).toEqual(APP_SETTINGS_DEFAULT.rentalItemPresets);
  });

  it('normalizes rental item presets on update', async () => {
    const service = new AppSettingsService(createPrismaMock());

    const result = await service.update({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: [
        {
          id: 'custom',
          name: 'Custom',
          current: false,
          sharedQuantityRules: APP_SETTINGS_DEFAULT.rentalItemPresets[0]!.sharedQuantityRules,
          items: [{ id: 'custom-1', label: '테스트', unit: '개', quantityFormula: 'ceil(total / 2)' }],
        },
      ],
      ...defaultStockInput,
      ...defaultFlightTimeInput,
    });

    expect(result.rentalItemPresets).toHaveLength(1);
    expect(result.rentalItemPresets[0]?.current).toBe(true);
    expect(result.rentalItemPresets[0]?.sharedQuantityRules).toEqual(
      APP_SETTINGS_DEFAULT.rentalItemPresets[0]!.sharedQuantityRules,
    );
    expect(result.rentalItemPresets[0]?.items[0]?.quantityFormula).toBe('ceil(total / 2)');
  });

  it('stores custom shared quantity rules on update', async () => {
    const service = new AppSettingsService(createPrismaMock());

    const result = await service.update({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: [
        {
          id: 'custom',
          name: 'Custom',
          current: true,
          sharedQuantityRules: [
            { id: 'a', minHeadcount: 1, maxHeadcount: 3, quantity: 1 },
            { id: 'b', minHeadcount: 4, maxHeadcount: null, quantity: 9 },
          ],
          items: [{ id: 'custom-1', label: '멀티탭', unit: '개', quantityFormula: 'shared' }],
        },
      ],
      ...defaultStockInput,
      ...defaultFlightTimeInput,
    });

    expect(result.rentalItemPresets[0]?.sharedQuantityRules[1]?.quantity).toBe(9);
  });

  it('fills default shared quantity rules when reading a legacy row', async () => {
    const service = new AppSettingsService(
      createPrismaMock({
        payload: {
          movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
          rentalItemPresets: [
            {
              id: 'legacy',
              name: 'Legacy',
              current: true,
              items: [{ id: 'legacy-1', label: '돗자리', unit: '개', quantityFormula: 'shared' }],
            },
          ],
        },
        updatedAt: new Date('2026-05-22T00:00:00.000Z'),
      }),
    );

    const result = await service.get();

    expect(result.rentalItemPresets[0]?.sharedQuantityRules).toEqual(
      APP_SETTINGS_DEFAULT.rentalItemPresets[0]!.sharedQuantityRules,
    );
    expect(result.tourListRentalItemStock).toEqual(defaultStockInput.tourListRentalItemStock);
    expect(result.flightTimeSettings).toEqual(APP_SETTINGS_DEFAULT.flightTimeSettings);
  });

  it('stores custom tour list rental stock on update', async () => {
    const service = new AppSettingsService(createPrismaMock());

    const result = await service.update({
      movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
      rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
      tourListRentalItemStock: {
        drone: 12,
        starlink: 6,
        powerbank: 3,
      },
      ...defaultFlightTimeInput,
    });

    expect(result.tourListRentalItemStock).toEqual({
      drone: 12,
      starlink: 6,
      powerbank: 3,
    });
  });

  it('rejects invalid colors', async () => {
    const service = new AppSettingsService(createPrismaMock());

    await expect(
      service.update({
        movementIntensityColors: [{ level: 'LEVEL_1', color: 'red' }],
        rentalItemPresets: APP_SETTINGS_DEFAULT.rentalItemPresets,
        ...defaultStockInput,
        ...defaultFlightTimeInput,
      }),
    ).rejects.toThrow('앱 설정 입력이 올바르지 않습니다.');
  });

  it('rejects invalid rental item formulas', async () => {
    const service = new AppSettingsService(createPrismaMock());

    await expect(
      service.update({
        movementIntensityColors: APP_SETTINGS_DEFAULT.movementIntensityColors,
        rentalItemPresets: [
          {
            id: 'bad',
            name: 'Bad',
            current: true,
            sharedQuantityRules: APP_SETTINGS_DEFAULT.rentalItemPresets[0]!.sharedQuantityRules,
            items: [{ id: 'bad-1', label: 'Bad', unit: '개', quantityFormula: 'Date.now()' }],
          },
        ],
        ...defaultStockInput,
        ...defaultFlightTimeInput,
      }),
    ).rejects.toThrow('앱 설정 입력이 올바르지 않습니다.');
  });
});
