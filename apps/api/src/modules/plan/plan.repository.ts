import type { Prisma, PrismaClient } from '@prisma/client';
import { planInclude, planVersionInclude } from './plan.mapper';
import type { PlanCreateDto, PlanUpdateDto, PlanVersionCreateDto, UserCreateDto, UserUpdateDto } from './plan.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class PlanRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findUsers() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { plans: { include: planInclude, orderBy: { createdAt: 'desc' } } } });
  }

  createUser(data: UserCreateDto) {
    return this.prisma.user.create({ data });
  }

  updateUser(id: string, data: UserUpdateDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.prisma.user.delete({ where: { id } });
    return true;
  }

  findManyByUser(userId: string) {
    return this.prisma.plan.findMany({ where: { userId }, include: planInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.plan.findUnique({ where: { id }, include: planInclude });
  }

  findVersionById(id: string) {
    return this.prisma.planVersion.findUnique({ where: { id }, include: { ...planVersionInclude, plan: true } });
  }

  findVersionsByPlan(planId: string) {
    return this.prisma.planVersion.findMany({
      where: { planId },
      include: { ...planVersionInclude, plan: true },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async getNextVersionNumber(planId: string) {
    const result = await this.prisma.planVersion.aggregate({
      where: { planId },
      _max: { versionNumber: true },
    });

    return (result._max.versionNumber ?? 0) + 1;
  }

  async createWithInitialVersion(data: PlanCreateDto) {
    const { initialVersion, ...planData } = data;

    const createdPlan = await this.prisma.plan.create({
      data: {
        ...planData,
        title: planData.title.trim(),
      },
    });

    const createdVersion = await this.prisma.planVersion.create({
      data: {
        planId: createdPlan.id,
        versionNumber: 1,
        variantType: initialVersion.variantType,
        totalDays: initialVersion.totalDays,
        changeNote: initialVersion.changeNote,
        planStops: {
          create: initialVersion.planStops.map((planStop) => ({
            dateCellText: planStop.dateCellText,
            destinationCellText: planStop.destinationCellText,
            timeCellText: planStop.timeCellText,
            scheduleCellText: planStop.scheduleCellText,
            lodgingCellText: planStop.lodgingCellText,
            mealCellText: planStop.mealCellText,
          })),
        },
      },
    });

    await this.prisma.plan.update({
      where: { id: createdPlan.id },
      data: { currentVersionId: createdVersion.id },
    });

    return this.findById(createdPlan.id);
  }

  updatePlan(id: string, data: PlanUpdateDto) {
    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.currentVersionId !== undefined ? { currentVersionId: data.currentVersionId } : {}),
      },
      include: planInclude,
    });
  }

  async createVersion(data: PlanVersionCreateDto, versionNumber: number) {
    const createdVersion = await this.prisma.planVersion.create({
      data: {
        planId: data.planId,
        parentVersionId: data.parentVersionId,
        versionNumber,
        variantType: data.variantType,
        totalDays: data.totalDays,
        changeNote: data.changeNote,
        planStops: {
          create: data.planStops.map((planStop) => ({
            dateCellText: planStop.dateCellText,
            destinationCellText: planStop.destinationCellText,
            timeCellText: planStop.timeCellText,
            scheduleCellText: planStop.scheduleCellText,
            lodgingCellText: planStop.lodgingCellText,
            mealCellText: planStop.mealCellText,
          })),
        },
      },
      include: { ...planVersionInclude, plan: true },
    });

    await this.prisma.plan.update({
      where: { id: data.planId },
      data: { currentVersionId: createdVersion.id },
    });

    return createdVersion;
  }

  setCurrentVersion(planId: string, versionId: string) {
    return this.prisma.plan.update({
      where: { id: planId },
      data: { currentVersionId: versionId },
      include: planInclude,
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.plan.delete({ where: { id } });
    return true;
  }
}
