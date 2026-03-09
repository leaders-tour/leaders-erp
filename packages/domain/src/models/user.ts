import type { Employee } from './employee';

export interface User {
  id: string;
  name: string;
  email: string | null;
  ownerEmployeeId?: string | null;
  ownerEmployee?: Employee | null;
  createdAt: Date;
  updatedAt: Date;
}
