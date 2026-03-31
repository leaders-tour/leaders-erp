import type { Prisma, PrismaClient } from '@prisma/client';
import {
  SPECIAL_MEAL_DESTINATION_RULES_DEFAULT,
  specialMealDestinationRulesPayloadSchema,
} from '@tour/validation';
import { createValidationError } from '../../lib/errors';
import { mapRowToSpecialMealDestinationRules } from './special-meal-destination-rules.mapper';

const ROW_ID = 'default';

export class SpecialMealDestinationRulesService {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<ReturnType<typeof mapRowToSpecialMealDestinationRules>> {
    let row = await this.prisma.specialMealDestinationRules.findUnique({
      where: { id: ROW_ID },
    });
    if (!row) {
      row = await this.prisma.specialMealDestinationRules.create({
        data: {
          id: ROW_ID,
          payload: SPECIAL_MEAL_DESTINATION_RULES_DEFAULT as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return mapRowToSpecialMealDestinationRules(row);
  }

  async update(input: unknown): Promise<ReturnType<typeof mapRowToSpecialMealDestinationRules>> {
    const parsed = specialMealDestinationRulesPayloadSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('특식 여행지 규칙 입력이 올바르지 않습니다.', parsed.error);
    }
    const row = await this.prisma.specialMealDestinationRules.upsert({
      where: { id: ROW_ID },
      create: {
        id: ROW_ID,
        payload: parsed.data as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: parsed.data as unknown as Prisma.InputJsonValue,
      },
    });
    return mapRowToSpecialMealDestinationRules(row);
  }
}
