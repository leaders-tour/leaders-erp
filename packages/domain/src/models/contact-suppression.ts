export interface ContactSuppression {
  id: string;
  email: string;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
