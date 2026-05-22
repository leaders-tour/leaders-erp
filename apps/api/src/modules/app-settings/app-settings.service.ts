import type { Prisma, PrismaClient } from '@prisma/client';
import {
  APP_SETTINGS_DEFAULT,
  APP_SETTINGS_KEY_APPEARANCE,
  appSettingsPayloadSchema,
  normalizeAppSettingsPayload,
} from '@tour/validation';
import { createValidationError } from '../../lib/errors';

export interface AppSettingsDto {
  movementIntensityColors: Array<{ level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5'; color: string }>;
  updatedAt: Date;
}

export class AppSettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRow(row: { payload: unknown; updatedAt: Date }): AppSettingsDto {
    return {
      ...normalizeAppSettingsPayload(row.payload),
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
    const parsed = appSettingsPayloadSchema.safeParse(input);
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
