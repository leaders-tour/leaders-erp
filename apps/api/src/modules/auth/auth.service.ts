import type { PrismaClient } from '@prisma/client';
import type { Response } from 'express';
import {
  employeeCreateSchema,
  employeePasswordResetSchema,
  employeeUpdateSchema,
  loginSchema,
} from '@tour/validation';
import {
  clearRefreshTokenCookie,
  createAccessTokenSession,
  createRefreshTokenCookie,
  generateRefreshToken,
  getRefreshTokenTtlMs,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  verifyPassword,
  type AuthenticatedEmployee,
} from '../../lib/auth';
import { DomainError } from '../../lib/errors';
import { AuthRepository } from './auth.repository';
import type { EmployeeCreateDto, EmployeePasswordResetDto, EmployeeUpdateDto, LoginDto } from './auth.types';

type Actor = AuthenticatedEmployee;
type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  role: Actor['role'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  private buildAuthPayload(employee: EmployeeRecord) {
    return {
      ...createAccessTokenSession({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive,
      }),
      employee,
    };
  }

  private issueRefreshToken(res: Response, token: string, expiresAt: Date): void {
    const maxAgeMs = Math.max(0, expiresAt.getTime() - Date.now());
    res.append('Set-Cookie', createRefreshTokenCookie(token, maxAgeMs));
  }

  private clearRefreshToken(res: Response): void {
    res.append('Set-Cookie', clearRefreshTokenCookie());
  }

  private async ensureAdminFloor(employeeId: string, nextRole: 'ADMIN' | 'STAFF', nextIsActive: boolean): Promise<void> {
    const existing = await new AuthRepository(this.prisma).findEmployeeForAdminChecks(employeeId);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Employee not found');
    }

    if (existing.role !== 'ADMIN' || !existing.isActive || (nextRole === 'ADMIN' && nextIsActive)) {
      return;
    }

    const otherActiveAdmins = await new AuthRepository(this.prisma).countOtherActiveAdmins(employeeId);
    if (otherActiveAdmins === 0) {
      throw new DomainError('VALIDATION_FAILED', 'At least one active admin must remain');
    }
  }

  async login(input: LoginDto, metadata: { res: Response; userAgent?: string | null }) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid login input');
    }

    const employee = await new AuthRepository(this.prisma).findEmployeeByEmail(parsed.data.email);
    if (!employee || !employee.isActive) {
      throw new DomainError('UNAUTHENTICATED', 'Invalid email or password');
    }

    const passwordMatched = await verifyPassword(parsed.data.password, employee.passwordHash);
    if (!passwordMatched) {
      throw new DomainError('UNAUTHENTICATED', 'Invalid email or password');
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + getRefreshTokenTtlMs());
    await new AuthRepository(this.prisma).createRefreshToken({
      employeeId: employee.id,
      tokenHash: hashRefreshToken(refreshToken),
      userAgent: metadata.userAgent?.slice(0, 191) ?? null,
      expiresAt: refreshTokenExpiresAt,
    });

    this.issueRefreshToken(metadata.res, refreshToken, refreshTokenExpiresAt);

    return this.buildAuthPayload(employee);
  }

  async refreshAccessToken(refreshToken: string | null, metadata: { res: Response }) {
    if (!refreshToken) {
      this.clearRefreshToken(metadata.res);
      throw new DomainError('UNAUTHENTICATED', 'Refresh token is missing');
    }

    const stored = await new AuthRepository(this.prisma).findRefreshToken(hashRefreshToken(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now() || !stored.employee.isActive) {
      this.clearRefreshToken(metadata.res);
      if (stored && !stored.revokedAt) {
        await new AuthRepository(this.prisma).revokeRefreshToken(stored.tokenHash);
      }
      throw new DomainError('UNAUTHENTICATED', 'Refresh token is invalid');
    }

    return this.buildAuthPayload(stored.employee);
  }

  async logout(refreshToken: string | null, metadata: { res: Response }) {
    if (refreshToken) {
      await new AuthRepository(this.prisma).revokeRefreshToken(hashRefreshToken(refreshToken));
    }
    this.clearRefreshToken(metadata.res);
    return true;
  }

  me(actor: Actor | null) {
    if (!actor) {
      throw new DomainError('UNAUTHENTICATED', 'Authentication is required');
    }

    return {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    };
  }

  async listEmployees(actor: Actor, activeOnly = true) {
    if (!activeOnly && actor.role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 'Admin access is required');
    }

    return new AuthRepository(this.prisma).listEmployees(actor.role === 'ADMIN' ? activeOnly : true);
  }

  async createEmployee(input: EmployeeCreateDto) {
    const parsed = employeeCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid employee input');
    }

    const existing = await new AuthRepository(this.prisma).findEmployeeByEmail(parsed.data.email);
    if (existing) {
      throw new DomainError('VALIDATION_FAILED', 'Employee email already exists');
    }

    return new AuthRepository(this.prisma).createEmployee({
      ...parsed.data,
      email: normalizeEmail(parsed.data.email),
      passwordHash: await hashPassword(parsed.data.password),
    });
  }

  async updateEmployee(id: string, input: EmployeeUpdateDto) {
    const parsed = employeeUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid employee update input');
    }

    const existing = await new AuthRepository(this.prisma).findEmployeeForAdminChecks(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Employee not found');
    }

    if (parsed.data.email) {
      const duplicate = await new AuthRepository(this.prisma).findEmployeeByEmail(parsed.data.email);
      if (duplicate && duplicate.id !== id) {
        throw new DomainError('VALIDATION_FAILED', 'Employee email already exists');
      }
    }

    await this.ensureAdminFloor(id, parsed.data.role ?? existing.role, parsed.data.isActive ?? existing.isActive);
    return new AuthRepository(this.prisma).updateEmployee(id, parsed.data);
  }

  async resetEmployeePassword(id: string, input: EmployeePasswordResetDto) {
    const parsed = employeePasswordResetSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid employee password reset input');
    }

    const existing = await new AuthRepository(this.prisma).findEmployeeForAdminChecks(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Employee not found');
    }

    await new AuthRepository(this.prisma).updateEmployee(id, {
      passwordHash: await hashPassword(parsed.data.newPassword),
    });
    await new AuthRepository(this.prisma).revokeRefreshTokensByEmployeeId(id);
    return new AuthRepository(this.prisma).findEmployeeById(id);
  }

  async deactivateEmployee(id: string) {
    const existing = await new AuthRepository(this.prisma).findEmployeeForAdminChecks(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Employee not found');
    }

    await this.ensureAdminFloor(id, existing.role, false);
    await new AuthRepository(this.prisma).revokeRefreshTokensByEmployeeId(id);
    return new AuthRepository(this.prisma).updateEmployee(id, { isActive: false });
  }
}
