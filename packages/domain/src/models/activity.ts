export interface Activity {
  id: string;
  timeBlockId: string;
  description: string;
  orderIndex: number;
  isOptional: boolean;
  conditionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}
