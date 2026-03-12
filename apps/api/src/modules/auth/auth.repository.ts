import type { Prisma, PrismaClient } from '@prisma/client';
import { normalizeEmail } from '../../lib/auth';
import type { EmployeeCreateDto, EmployeeSelfSignupDto, EmployeeUpdateDto } from './auth.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class AuthRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findEmployeeByEmail(email: string) {
    return this.prisma.employee.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  findEmployeeById(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      select: employeeSelect,
    });
  }

  findEmployeeForAdminChecks(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  listEmployees(activeOnly: boolean) {
    return this.prisma.employee.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      select: employeeSelect,
      orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { name: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createEmployee(data: EmployeeCreateDto & { passwordHash: string }) {
    return this.prisma.employee.create({
      data: {
        name: data.name.trim(),
        email: normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        role: data.role,
      },
      select: employeeSelect,
    });
  }

  createEmployeeSelfSignup(data: EmployeeSelfSignupDto & { passwordHash: string; role: 'ADMIN' | 'STAFF' }) {
    return this.prisma.employee.create({
      data: {
        name: data.name.trim(),
        email: normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        role: data.role,
      },
      select: employeeSelect,
    });
  }

  updateEmployee(id: string, data: EmployeeUpdateDto & { passwordHash?: string }) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.email !== undefined ? { email: normalizeEmail(data.email) } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
      },
      select: employeeSelect,
    });
  }

  createRefreshToken(input: {
    employeeId: string;
    tokenHash: string;
    userAgent?: string | null;
    expiresAt: Date;
  }) {
    return this.prisma.employeeRefreshToken.create({
      data: input,
    });
  }

  findRefreshToken(tokenHash: string) {
    return this.prisma.employeeRefreshToken.findUnique({
      where: { tokenHash },
      include: {
        employee: {
          select: employeeSelect,
        },
      },
    });
  }

  revokeRefreshToken(tokenHash: string) {
    return this.prisma.employeeRefreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  revokeRefreshTokensByEmployeeId(employeeId: string) {
    return this.prisma.employeeRefreshToken.updateMany({
      where: {
        employeeId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async countOtherActiveAdmins(employeeId: string) {
    return this.prisma.employee.count({
      where: {
        id: { not: employeeId },
        role: 'ADMIN',
        isActive: true,
      },
    });
  }

  countActiveAdmins() {
    return this.prisma.employee.count({
      where: {
        role: 'ADMIN',
        isActive: true,
      },
    });
  }
}
