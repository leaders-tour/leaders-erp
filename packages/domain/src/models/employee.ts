import type { EmployeeRole } from '../enums/employee-role';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
