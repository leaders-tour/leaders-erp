import type { Prisma, PrismaClient } from '@prisma/client';
import {
  APP_SETTINGS_DEFAULT,
  APP_SETTINGS_KEY_APPEARANCE,
  appSettingsPayloadSchema,
  normalizeAppSettingsPayload,
  type TourListRentalItemStock,
} from '@tour/validation';
import { createValidationError } from '../../lib/errors';

function toGraphqlTourListRentalItemStock(stock: TourListRentalItemStock) {
  return {
    drone: stock.DRONE,
    starlink: stock.STARLINK,
    powerbank: stock.POWERBANK,
  };
}

function fromGraphqlTourListRentalItemStockInput(value: unknown): TourListRentalItemStock | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.drone !== 'number' ||
    typeof raw.starlink !== 'number' ||
    typeof raw.powerbank !== 'number'
  ) {
    return undefined;
  }
  return {
    DRONE: raw.drone,
    STARLINK: raw.starlink,
    POWERBANK: raw.powerbank,
  };
}

function normalizeAppSettingsUpdateInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') {
    return input;
  }
  const raw = input as Record<string, unknown>;
  const stock = fromGraphqlTourListRentalItemStockInput(raw.tourListRentalItemStock);
  if (!stock) {
    return input;
  }
  return {
    ...raw,
    tourListRentalItemStock: stock,
  };
}

export interface AppSettingsDto {
  movementIntensityColors: Array<{ level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5'; color: string }>;
  rentalItemPresets: Array<{
    id: string;
    name: string;
    current: boolean;
    sharedQuantityRules: Array<{ id: string; minHeadcount: number; maxHeadcount: number | null; quantity: number }>;
    items: Array<{ id: string; label: string; unit: string; quantityFormula: string }>;
  }>;
  tourListRentalItemStock: ReturnType<typeof toGraphqlTourListRentalItemStock>;
  updatedAt: Date;
}

export class AppSettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRow(row: { payload: unknown; updatedAt: Date }): AppSettingsDto {
    const payload = normalizeAppSettingsPayload(row.payload);
    return {
      ...payload,
      tourListRentalItemStock: toGraphqlTourListRentalItemStock(payload.tourListRentalItemStock),
      updatedAt: row.updatedAt,
    };
  }

  async get(): Promise<AppSettingsDto> {
    let row = await this.prisma.appSetting.findUnique({
      where: { key: APP_SETTINGS_KEY_APPEARANCE },
    });
    if (!row) {
      row = await this.prisma.appSetting.create({
        data: {
          key: APP_SETTINGS_KEY_APPEARANCE,
          payload: APP_SETTINGS_DEFAULT as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return this.mapRow(row);
  }

  async update(input: unknown): Promise<AppSettingsDto> {
    const parsed = appSettingsPayloadSchema.safeParse(normalizeAppSettingsUpdateInput(input));
    if (!parsed.success) {
      throw createValidationError('앱 설정 입력이 올바르지 않습니다.', parsed.error);
    }

    const payload = normalizeAppSettingsPayload(parsed.data);
    const row = await this.prisma.appSetting.upsert({
      where: { key: APP_SETTINGS_KEY_APPEARANCE },
      create: {
        key: APP_SETTINGS_KEY_APPEARANCE,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
    return this.mapRow(row);
  }
}
