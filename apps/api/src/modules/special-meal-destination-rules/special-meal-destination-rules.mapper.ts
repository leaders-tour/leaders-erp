import {
  parseSpecialMealDestinationRulesPayload,
  type SpecialMealDestinationRulesPayload,
} from '@tour/validation';

export function mapRowToSpecialMealDestinationRules(row: {
  payload: unknown;
  updatedAt: Date;
}): SpecialMealDestinationRulesPayload & { updatedAt: Date } {
  const payload = parseSpecialMealDestinationRulesPayload(row.payload);
  return { ...payload, updatedAt: row.updatedAt };
}
