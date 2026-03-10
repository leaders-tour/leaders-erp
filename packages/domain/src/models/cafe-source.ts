import type { CafeSourceType } from '../enums/cafe-source-type';

export interface CafeSource {
  id: string;
  sourceType: CafeSourceType;
  cafeId: string;
  menuId: string;
  boardName: string;
  boardUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
