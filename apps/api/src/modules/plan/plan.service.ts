import type { Prisma, PrismaClient } from '@prisma/client';
import {
  planCreateSchema,
  planUpdateSchema,
  planVersionCreateSchema,
  userCreateSchema,
  userUpdateSchema,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { PlanRepository } from './plan.repository';
import type { PlanCreateDto, PlanUpdateDto, PlanVersionCreateDto, UserCreateDto, UserUpdateDto } from './plan.types';

export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  private formatDocumentDatePart(value: string): string {
    const date = new Date(value);
    const yy = String(date.getUTCFullYear()).slice(-2);
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  private async generateDocumentNumber(travelStartDate: string): Promise<string> {
    const datePart = this.formatDocumentDatePart(travelStartDate);

    for (let retry = 0; retry < 10; retry += 1) {
      const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const candidate = `${datePart}${randomPart}`;
      const existing = await this.prisma.planVersionMeta.findUnique({
        where: { documentNumber: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }

    throw new DomainError('INTERNAL', 'Failed to allocate unique document number');
  }

  listUsers() {
    return new PlanRepository(this.prisma).findUsers();
  }

  getUser(id: string) {
    return new PlanRepository(this.prisma).findUserById(id);
  }

  createUser(input: UserCreateDto) {
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid user input');
    }

    return new PlanRepository(this.prisma).createUser(parsed.data);
  }

  async updateUser(id: string, input: UserUpdateDto) {
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid user update input');
    }

    const existing = await new PlanRepository(this.prisma).findUserById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }

    return new PlanRepository(this.prisma).updateUser(id, parsed.data);
  }

  deleteUser(id: string) {
    return new PlanRepository(this.prisma).deleteUser(id);
  }

  list(userId: string) {
    return new PlanRepository(this.prisma).findManyByUser(userId);
  }

  get(id: string) {
    return new PlanRepository(this.prisma).findById(id);
  }

  listVersions(planId: string) {
    return new PlanRepository(this.prisma).findVersionsByPlan(planId);
  }

  getVersion(id: string) {
    return new PlanRepository(this.prisma).findVersionById(id);
  }

  async create(input: PlanCreateDto) {
    const parsed = planCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan input');
    }

    if (parsed.data.initialVersion.planStops.length !== parsed.data.initialVersion.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match planStops length');
    }

    const [user, region] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } }),
      this.prisma.region.findUnique({ where: { id: parsed.data.regionId }, select: { id: true } }),
    ]);

    if (!user) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }
    if (!region) {
      throw new DomainError('NOT_FOUND', 'Region not found');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const documentNumber = await this.generateDocumentNumber(parsed.data.initialVersion.meta.travelStartDate);
      return new PlanRepository(tx).createWithInitialVersion(parsed.data, documentNumber);
    });
  }

  async update(id: string, input: PlanUpdateDto) {
    const parsed = planUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan update input');
    }

    const existing = await new PlanRepository(this.prisma).findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    if (parsed.data.currentVersionId) {
      const targetVersion = await this.prisma.planVersion.findUnique({
        where: { id: parsed.data.currentVersionId },
        select: { id: true, planId: true },
      });

      if (!targetVersion || targetVersion.planId !== id) {
        throw new DomainError('VALIDATION_FAILED', 'currentVersionId must belong to the same plan');
      }
    }

    return new PlanRepository(this.prisma).updatePlan(id, parsed.data);
  }

  async createVersion(input: PlanVersionCreateDto) {
    const parsed = planVersionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan version input');
    }

    if (parsed.data.planStops.length !== parsed.data.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match planStops length');
    }

    const plan = await new PlanRepository(this.prisma).findById(parsed.data.planId);
    if (!plan) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    if (parsed.data.parentVersionId) {
      const parentVersion = await this.prisma.planVersion.findUnique({
        where: { id: parsed.data.parentVersionId },
        select: { id: true, planId: true },
      });

      if (!parentVersion || parentVersion.planId !== parsed.data.planId) {
        throw new DomainError('VALIDATION_FAILED', 'parentVersionId must belong to the same plan');
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const repository = new PlanRepository(tx);
      const versionNumber = await repository.getNextVersionNumber(parsed.data.planId);
      const documentNumber = await this.generateDocumentNumber(parsed.data.meta.travelStartDate);
      return repository.createVersion(parsed.data, versionNumber, documentNumber);
    });
  }

  async setCurrentVersion(planId: string, versionId: string) {
    const [plan, version] = await Promise.all([
      new PlanRepository(this.prisma).findById(planId),
      this.prisma.planVersion.findUnique({ where: { id: versionId }, select: { id: true, planId: true } }),
    ]);

    if (!plan) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    if (!version || version.planId !== planId) {
      throw new DomainError('VALIDATION_FAILED', 'versionId must belong to the same plan');
    }

    return new PlanRepository(this.prisma).setCurrentVersion(planId, versionId);
  }

  delete(id: string) {
    return new PlanRepository(this.prisma).delete(id);
  }
}
