import type { DealStage, DealTodoStatus, Prisma, PrismaClient } from '@prisma/client';
import { planInclude, planVersionInclude } from './plan.mapper';
import type {
  DealPipelineCardUpdateDto,
  PlanCreateDto,
  PlanUpdateDto,
  PlanVersionCreateDto,
  UserCreateDto,
  UserNoteCreateDto,
  UserUpdateDto,
} from './plan.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export class PlanRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findUsers() {
    return this.prisma.user.findMany({
      orderBy: [{ dealStage: 'asc' }, { dealStageOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { plans: { include: planInclude, orderBy: { createdAt: 'desc' } } } });
  }

  findUserNotes(userId: string) {
    return this.prisma.userNote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDealTodoTemplatesByStages(stages: DealStage[]) {
    if (stages.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.dealTodoTemplate.findMany({
      where: {
        stage: { in: stages },
        isActive: true,
      },
      orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createUser(data: UserCreateDto) {
    return this.prisma.user.create({ data });
  }

  updateUser(id: string, data: UserUpdateDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  createUserNote(data: UserNoteCreateDto) {
    return this.prisma.userNote.create({ data });
  }

  createUserDealTodosFromTemplates(
    input: Array<{
      userId: string;
      stage: DealStage;
      templateId: string;
      title: string;
      description?: string | null;
    }>,
  ) {
    if (input.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return this.prisma.userDealTodo.createMany({
      data: input.map((item) => ({
        userId: item.userId,
        stage: item.stage,
        templateId: item.templateId,
        title: item.title,
        description: item.description ?? null,
        status: 'TODO',
      })),
      skipDuplicates: true,
    });
  }

  findUserDealTodos(userId: string, includeDone: boolean) {
    return this.prisma.userDealTodo.findMany({
      where: {
        userId,
        ...(includeDone ? {} : { status: { in: ['TODO', 'DOING'] } }),
      },
      orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  updateUserDealTodoStatus(id: string, status: DealTodoStatus) {
    return this.prisma.userDealTodo.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'DONE' ? new Date() : null,
      },
    });
  }

  async reorderDealPipeline(updates: DealPipelineCardUpdateDto[]): Promise<boolean> {
    await Promise.all(
      updates.map((update) =>
        this.prisma.user.update({
          where: { id: update.userId },
          data: {
            dealStage: update.dealStage,
            dealStageOrder: update.dealStageOrder,
          },
        }),
      ),
    );

    return true;
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
    return this.prisma.planVersion.findUnique({
      where: { id },
      include: { ...planVersionInclude, plan: { include: { user: true, region: true } } },
    });
  }

  findVersionsByPlan(planId: string) {
    return this.prisma.planVersion.findMany({
      where: { planId },
      include: { ...planVersionInclude, plan: { include: { user: true, region: true } } },
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

  async createWithInitialVersion(data: PlanCreateDto, documentNumberBase: string, documentNumber: string) {
    const { initialVersion, ...planData } = data;
    const { manualAdjustments: _manualAdjustments, ...initialVersionData } = initialVersion;

    const createdPlan = await this.prisma.plan.create({
      data: {
        ...planData,
        title: planData.title.trim(),
        documentNumberBase,
      },
    });

    const createdVersion = await this.prisma.planVersion.create({
      data: {
        planId: createdPlan.id,
        versionNumber: 1,
        variantType: initialVersionData.variantType,
        totalDays: initialVersionData.totalDays,
        changeNote: initialVersionData.changeNote,
        meta: {
          create: {
            leaderName: initialVersionData.meta.leaderName,
            documentNumber,
            travelStartDate: new Date(initialVersionData.meta.travelStartDate),
            travelEndDate: new Date(initialVersionData.meta.travelEndDate),
            headcountTotal: initialVersionData.meta.headcountTotal,
            headcountMale: initialVersionData.meta.headcountMale,
            headcountFemale: initialVersionData.meta.headcountFemale,
            vehicleType: initialVersionData.meta.vehicleType,
            flightInTime: initialVersionData.meta.flightInTime,
            flightOutTime: initialVersionData.meta.flightOutTime,
            pickupDropNote: initialVersionData.meta.pickupDropNote,
            externalPickupDropNote: initialVersionData.meta.externalPickupDropNote,
            includeRentalItems: initialVersionData.meta.includeRentalItems,
            rentalItemsText: initialVersionData.meta.rentalItemsText,
            eventCodes: [],
            extraLodgings: initialVersionData.meta.extraLodgings,
            remark: initialVersionData.meta.remark,
          },
        },
        planVersionEvents: {
          create: initialVersionData.meta.eventIds.map((eventId) => ({
            eventId,
          })),
        },
        planStops: {
          create: initialVersionData.planStops.map((planStop) => ({
            locationId: planStop.locationId,
            locationVersionId: planStop.locationVersionId,
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

  async createVersion(data: PlanVersionCreateDto, versionNumber: number, documentNumber: string) {
    const { manualAdjustments: _manualAdjustments, ...versionData } = data;

    const createdVersion = await this.prisma.planVersion.create({
      data: {
        planId: versionData.planId,
        parentVersionId: versionData.parentVersionId,
        versionNumber,
        variantType: versionData.variantType,
        totalDays: versionData.totalDays,
        changeNote: versionData.changeNote,
        meta: {
          create: {
            leaderName: versionData.meta.leaderName,
            documentNumber,
            travelStartDate: new Date(versionData.meta.travelStartDate),
            travelEndDate: new Date(versionData.meta.travelEndDate),
            headcountTotal: versionData.meta.headcountTotal,
            headcountMale: versionData.meta.headcountMale,
            headcountFemale: versionData.meta.headcountFemale,
            vehicleType: versionData.meta.vehicleType,
            flightInTime: versionData.meta.flightInTime,
            flightOutTime: versionData.meta.flightOutTime,
            pickupDropNote: versionData.meta.pickupDropNote,
            externalPickupDropNote: versionData.meta.externalPickupDropNote,
            includeRentalItems: versionData.meta.includeRentalItems,
            rentalItemsText: versionData.meta.rentalItemsText,
            eventCodes: [],
            extraLodgings: versionData.meta.extraLodgings,
            remark: versionData.meta.remark,
          },
        },
        planVersionEvents: {
          create: versionData.meta.eventIds.map((eventId) => ({
            eventId,
          })),
        },
        planStops: {
          create: versionData.planStops.map((planStop) => ({
            locationId: planStop.locationId,
            locationVersionId: planStop.locationVersionId,
            dateCellText: planStop.dateCellText,
            destinationCellText: planStop.destinationCellText,
            timeCellText: planStop.timeCellText,
            scheduleCellText: planStop.scheduleCellText,
            lodgingCellText: planStop.lodgingCellText,
            mealCellText: planStop.mealCellText,
          })),
        },
      },
      include: { ...planVersionInclude, plan: { include: { user: true, region: true } } },
    });

    await this.prisma.plan.update({
      where: { id: versionData.planId },
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
