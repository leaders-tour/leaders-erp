import type { AppContext } from '../context';
import { DomainError } from './errors';

export function requireEmployee(ctx: AppContext) {
  if (!ctx.employee || !ctx.employee.isActive) {
    throw new DomainError('UNAUTHENTICATED', 'Authentication is required');
  }

  return ctx.employee;
}

export function requireAdmin(ctx: AppContext) {
  const employee = requireEmployee(ctx);
  if (employee.role !== 'ADMIN') {
    throw new DomainError('FORBIDDEN', 'Admin access is required');
  }

  return employee;
}

export function requireStaffOrAbove(ctx: AppContext) {
  const employee = requireEmployee(ctx);
  if (employee.role === 'OPS_STAFF') {
    throw new DomainError('FORBIDDEN', 'Staff access is required');
  }

  return employee;
}
