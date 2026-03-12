import { EmployeeRole } from '@tour/domain';
import { z } from 'zod';

export const employeeRoleSchema = z.nativeEnum(EmployeeRole);

export const employeeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(4).max(200),
  role: employeeRoleSchema.default(EmployeeRole.STAFF),
});

export const employeeSelfSignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(4).max(200),
});

export const employeeUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: employeeRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

export const employeePasswordResetSchema = z.object({
  newPassword: z.string().min(4).max(200),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeSelfSignupInput = z.infer<typeof employeeSelfSignupSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeePasswordResetInput = z.infer<typeof employeePasswordResetSchema>;
