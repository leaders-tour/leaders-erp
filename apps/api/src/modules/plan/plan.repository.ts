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

function toTransportGroupCreateManyInput(
  transportGroups: Array<{
    teamName: string;
    headcount: number;
    flightInDate: string;
    flightInTime: string;
    flightOutDate: string;
    flightOutTime: string;
    pickupDate?: string;
    pickupTime?: string;
    pickupPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
    pickupPlaceCustomText?: string;
    dropDate?: string;
    dropTime?: string;
    dropPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
    dropPlaceCustomText?: string;
  }>,
) {
  return transportGroups.map((group, index) => ({
    orderIndex: index,
    teamName: group.teamName,
    headcount: group.headcount,
    flightInDate: new Date(group.flightInDate),
    flightInTime: group.flightInTime,
    flightOutDate: new Date(group.flightOutDate),
    flightOutTime: group.flightOutTime,
    pickupDate: group.pickupDate ? new Date(group.pickupDate) : null,
    pickupTime: group.pickupTime ?? null,
    pickupPlaceType: group.pickupPlaceType ?? null,
    pickupPlaceCustomText: group.pickupPlaceCustomText ?? null,
    dropDate: group.dropDate ? new Date(group.dropDate) : null,
    dropTime: group.dropTime ?? null,
    dropPlaceType: group.dropPlaceType ?? null,
    dropPlaceCustomText: group.dropPlaceCustomText ?? null,
  }));
}

function buildPlanVersionMetaCreateInput(
  meta: {
    leaderName: string;
    travelStartDate: string;
    travelEndDate: string;
    headcountTotal: number;
    headcountMale: number;
    headcountFemale: number;
    vehicleType: string;
    flightInTime: string;
    flightOutTime: string;
    pickupDate?: string;
    pickupTime?: string;
    dropDate?: string;
    dropTime?: string;
    pickupDropNote?: string;
    pickupPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
    pickupPlaceCustomText?: string;
    dropPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
    dropPlaceCustomText?: string;
    externalPickupDate?: string;
    externalPickupTime?: string;
    externalPickupPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
    externalPickupPlaceCustomText?: string;
    externalDropDate?: string;
    externalDropTime?: string;
    externalDropPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
    externalDropPlaceCustomText?: string;
    externalPickupDropNote?: string;
    externalTransfers: Prisma.InputJsonValue;
    specialNote?: string;
    includeRentalItems: boolean;
    rentalItemsText: string;
    extraLodgings: Prisma.InputJsonValue;
    remark?: string;
    transportGroups: Array<{
      teamName: string;
      headcount: number;
      flightInDate: string;
      flightInTime: string;
      flightOutDate: string;
      flightOutTime: string;
      pickupDate?: string;
      pickupTime?: string;
      pickupPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
      pickupPlaceCustomText?: string;
      dropDate?: string;
      dropTime?: string;
      dropPlaceType?: 'AIRPORT' | 'OZ_HOUSE' | 'ULAANBAATAR' | 'CUSTOM';
      dropPlaceCustomText?: string;
    }>;
  },
  documentNumber: string,
) {
  const firstTransportGroup = meta.transportGroups[0];

  return {
    leaderName: meta.leaderName,
    documentNumber,
    travelStartDate: new Date(meta.travelStartDate),
    travelEndDate: new Date(meta.travelEndDate),
    headcountTotal: meta.headcountTotal,
    headcountMale: meta.headcountMale,
    headcountFemale: meta.headcountFemale,
    vehicleType: meta.vehicleType,
    flightInTime: firstTransportGroup?.flightInTime ?? meta.flightInTime,
    flightOutTime: firstTransportGroup?.flightOutTime ?? meta.flightOutTime,
    pickupDate: firstTransportGroup?.pickupDate
      ? new Date(firstTransportGroup.pickupDate)
      : meta.pickupDate
        ? new Date(meta.pickupDate)
        : null,
    pickupTime: firstTransportGroup?.pickupTime ?? meta.pickupTime ?? null,
    dropDate: firstTransportGroup?.dropDate ? new Date(firstTransportGroup.dropDate) : meta.dropDate ? new Date(meta.dropDate) : null,
    dropTime: firstTransportGroup?.dropTime ?? meta.dropTime ?? null,
    pickupDropNote: meta.pickupDropNote,
    pickupPlaceType: firstTransportGroup?.pickupPlaceType ?? meta.pickupPlaceType ?? null,
    pickupPlaceCustomText: firstTransportGroup?.pickupPlaceCustomText ?? meta.pickupPlaceCustomText ?? null,
    dropPlaceType: firstTransportGroup?.dropPlaceType ?? meta.dropPlaceType ?? null,
    dropPlaceCustomText: firstTransportGroup?.dropPlaceCustomText ?? meta.dropPlaceCustomText ?? null,
    externalPickupDate: meta.externalPickupDate ? new Date(meta.externalPickupDate) : null,
    externalPickupTime: meta.externalPickupTime ?? null,
    externalPickupPlaceType: meta.externalPickupPlaceType ?? null,
    externalPickupPlaceCustomText: meta.externalPickupPlaceCustomText ?? null,
    externalDropDate: meta.externalDropDate ? new Date(meta.externalDropDate) : null,
    externalDropTime: meta.externalDropTime ?? null,
    externalDropPlaceType: meta.externalDropPlaceType ?? null,
    externalDropPlaceCustomText: meta.externalDropPlaceCustomText ?? null,
    externalPickupDropNote: meta.externalPickupDropNote,
    externalTransfers: meta.externalTransfers,
    specialNote: meta.specialNote,
    includeRentalItems: meta.includeRentalItems,
    rentalItemsText: meta.rentalItemsText,
    eventCodes: [],
    extraLodgings: meta.extraLodgings,
    remark: meta.remark,
    transportGroups: {
      create: toTransportGroupCreateManyInput(meta.transportGroups),
    },
  };
}

export class PlanRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findUsers() {
    return this.prisma.user.findMany({
      include: {
        ownerEmployee: true,
        dealTodos: {
          orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ dealStage: 'asc' }, { dealStageOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        ownerEmployee: true,
        plans: { include: planInclude, orderBy: { createdAt: 'desc' } },
        dealTodos: { orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }] },
      },
    });
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
      include: { ...planVersionInclude, plan: { include: { user: { include: { ownerEmployee: true } }, region: true } } },
    });
  }

  findVersionsByPlan(planId: string) {
    return this.prisma.planVersion.findMany({
      where: { planId },
      include: { ...planVersionInclude, plan: { include: { user: { include: { ownerEmployee: true } }, region: true } } },
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
            ...buildPlanVersionMetaCreateInput(initialVersionData.meta, documentNumber),
          },
        },
        planVersionEvents: {
          create: initialVersionData.meta.eventIds.map((eventId) => ({
            eventId,
          })),
        },
        planStops: {
          create: initialVersionData.planStops.map((planStop) => ({
            segmentId: planStop.segmentId,
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
            ...buildPlanVersionMetaCreateInput(versionData.meta, documentNumber),
          },
        },
        planVersionEvents: {
          create: versionData.meta.eventIds.map((eventId) => ({
            eventId,
          })),
        },
        planStops: {
          create: versionData.planStops.map((planStop) => ({
            segmentId: planStop.segmentId,
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
      include: { ...planVersionInclude, plan: { include: { user: { include: { ownerEmployee: true } }, region: true } } },
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
