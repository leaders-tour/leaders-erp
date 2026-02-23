import type { OverrideTargetType } from '../enums/override-target-type';

export interface Override {
  id: string;
  planVersionId: string;
  targetType: OverrideTargetType;
  targetId: string;
  fieldName: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}
