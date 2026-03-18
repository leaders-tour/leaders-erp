import type { DealStage, Prisma, PrismaClient } from '@prisma/client';
import {
  dealPipelineReorderSchema,
  type LodgingSelectionInput,
  planCreateSchema,
  planPricingPreviewSchema,
  planUpdateSchema,
  planVersionCreateSchema,
  userCreateSchema,
  userDealTodoStatusUpdateSchema,
  userDealTodosQuerySchema,
  userNoteCreateSchema,
  userUpdateSchema,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { PricingService } from '../pricing/pricing.service';
import { PlanRepository } from './plan.repository';
import type {
  DealPipelineCardUpdateDto,
  DealPipelineReorderDto,
  PlanCreateDto,
  PlanPricingPreviewDto,
  PlanUpdateDto,
  PlanVersionCreateDto,
  UserCreateDto,
  UserDealTodoStatusUpdateDto,
  UserDealTodosQueryDto,
  UserNoteCreateDto,
  UserUpdateDto,
} from './plan.types';

type NormalizedLodgingSelection = LodgingSelectionInput & {
  customLodgingId?: string;
  customLodgingNameSnapshot: string | null;
  pricingModeSnapshot: 'PER_PERSON' | 'PER_TEAM' | 'FLAT' | null;
  priceSnapshotKrw: number | null;
};

export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  private async validateOwnerEmployeeId(ownerEmployeeId: string | null | undefined): Promise<void> {
    if (!ownerEmployeeId) {
      return;
    }

    const ownerEmployee = await this.prisma.employee.findUnique({
      where: { id: ownerEmployeeId },
      select: { id: true },
    });

    if (!ownerEmployee) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid owner employee');
    }
  }

  private async validateEventIds(eventIds: string[]): Promise<void> {
    const uniqueEventIds = Array.from(new Set(eventIds));
    if (uniqueEventIds.length !== eventIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'eventIds must not contain duplicates');
    }
    if (uniqueEventIds.length === 0) {
      return;
    }

    const eventCount = await this.prisma.event.count({
      where: { id: { in: uniqueEventIds } },
    });

    if (eventCount !== uniqueEventIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more eventIds are invalid');
    }
  }

  private async normalizePlanStopsWithLocationReferences<
    T extends {
      segmentId?: string;
      segmentVersionId?: string;
      overnightStayId?: string;
      overnightStayDayOrder?: number;
      overnightStayConnectionId?: string;
      overnightStayConnectionVersionId?: string;
      locationId?: string;
      locationVersionId?: string;
    },
  >(
    planStops: T[],
  ): Promise<T[]> {
    const locationVersionIds = Array.from(
      new Set(
        planStops
          .map((planStop) => planStop.locationVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    let normalizedStops = planStops;
    if (locationVersionIds.length > 0) {
      const versions = await this.prisma.locationVersion.findMany({
        where: { id: { in: locationVersionIds } },
        select: { id: true, locationId: true },
      });

      if (versions.length !== locationVersionIds.length) {
        throw new DomainError('VALIDATION_FAILED', 'One or more locationVersionId values are invalid');
      }

      const locationIdByVersionId = new Map(versions.map((version) => [version.id, version.locationId]));

      normalizedStops = planStops.map((planStop) => {
        if (!planStop.locationVersionId) {
          return planStop;
        }

        const expectedLocationId = locationIdByVersionId.get(planStop.locationVersionId);
        if (!expectedLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'One or more locationVersionId values are invalid');
        }

        if (planStop.locationId && planStop.locationId !== expectedLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId must belong to the same location');
        }

        return {
          ...planStop,
          locationId: expectedLocationId,
        };
      });
    }

    const segmentIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.segmentId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const segmentVersionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.segmentVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const overnightStayIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.overnightStayId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const overnightStayConnectionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.overnightStayConnectionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const overnightStayConnectionVersionIds = Array.from(
      new Set(
        normalizedStops
          .map((planStop) => planStop.overnightStayConnectionVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    if (
      segmentIds.length === 0 &&
      segmentVersionIds.length === 0 &&
      overnightStayIds.length === 0 &&
      overnightStayConnectionIds.length === 0 &&
      overnightStayConnectionVersionIds.length === 0
    ) {
      return normalizedStops;
    }

    const segments =
      segmentIds.length > 0
        ? await this.prisma.segment.findMany({
            where: { id: { in: segmentIds } },
            select: { id: true, fromLocationId: true, toLocationId: true },
          })
        : [];
    if (segments.length !== segmentIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more segmentId values are invalid');
    }

    const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
    const segmentVersions =
      segmentVersionIds.length > 0
        ? await this.prisma.segmentVersion.findMany({
            where: { id: { in: segmentVersionIds } },
            select: { id: true, segmentId: true },
          })
        : [];
    if (segmentVersions.length !== segmentVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more segmentVersionId values are invalid');
    }
    const segmentVersionById = new Map(segmentVersions.map((segmentVersion) => [segmentVersion.id, segmentVersion]));
    const overnightStays =
      overnightStayIds.length > 0
        ? await this.prisma.overnightStay.findMany({
            where: { id: { in: overnightStayIds } },
            select: { id: true, locationId: true, days: { select: { dayOrder: true } } },
          })
        : [];
    if (overnightStays.length !== overnightStayIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayId values are invalid');
    }
    const overnightStayById = new Map(overnightStays.map((overnightStay) => [overnightStay.id, overnightStay]));
    const overnightStayDayOrdersById = new Map(
      overnightStays.map((overnightStay) => [
        overnightStay.id,
        overnightStay.days
          .map((day) => day.dayOrder)
          .slice()
          .sort((left, right) => left - right),
      ]),
    );
    const overnightStayConnections =
      overnightStayConnectionIds.length > 0
        ? await this.prisma.overnightStayConnection.findMany({
            where: { id: { in: overnightStayConnectionIds } },
            select: { id: true, fromOvernightStayId: true, toLocationId: true },
          })
        : [];
    if (overnightStayConnections.length !== overnightStayConnectionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionId values are invalid');
    }
    const overnightStayConnectionById = new Map(
      overnightStayConnections.map((overnightStayConnection) => [overnightStayConnection.id, overnightStayConnection]),
    );
    const overnightStayConnectionVersions =
      overnightStayConnectionVersionIds.length > 0
        ? await this.prisma.overnightStayConnectionVersion.findMany({
            where: { id: { in: overnightStayConnectionVersionIds } },
            select: { id: true, overnightStayConnectionId: true },
          })
        : [];
    if (overnightStayConnectionVersions.length !== overnightStayConnectionVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionVersionId values are invalid');
    }
    const overnightStayConnectionVersionById = new Map(
      overnightStayConnectionVersions.map((version) => [version.id, version]),
    );
    normalizedStops.forEach((planStop, index) => {
      if (planStop.segmentVersionId) {
        if (!planStop.segmentId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentVersionId requires segmentId');
        }
        const segmentVersion = segmentVersionById.get(planStop.segmentVersionId);
        if (!segmentVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more segmentVersionId values are invalid');
        }
        if (segmentVersion.segmentId !== planStop.segmentId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentVersionId must belong to segmentId');
        }
      }
      if (planStop.overnightStayConnectionVersionId) {
        if (!planStop.overnightStayConnectionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionVersionId requires overnightStayConnectionId');
        }
        const overnightStayConnectionVersion = overnightStayConnectionVersionById.get(planStop.overnightStayConnectionVersionId);
        if (!overnightStayConnectionVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionVersionId values are invalid');
        }
        if (overnightStayConnectionVersion.overnightStayConnectionId !== planStop.overnightStayConnectionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionVersionId must belong to overnightStayConnectionId');
        }
      }
      if (planStop.overnightStayDayOrder !== undefined && !planStop.overnightStayId) {
        throw new DomainError('VALIDATION_FAILED', 'overnightStayDayOrder requires overnightStayId');
      }
      if (planStop.overnightStayId) {
        const overnightStay = overnightStayById.get(planStop.overnightStayId);
        const overnightStayDayOrders = overnightStayDayOrdersById.get(planStop.overnightStayId) ?? [];
        if (!overnightStay) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayId values are invalid');
        }
        if (!planStop.locationId || overnightStay.locationId !== planStop.locationId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayId must match locationId');
        }
        if (
          planStop.overnightStayDayOrder === undefined ||
          !overnightStayDayOrders.includes(planStop.overnightStayDayOrder)
        ) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayDayOrder must match the overnightStay days');
        }
        if (
          planStop.segmentId ||
          planStop.segmentVersionId ||
          planStop.overnightStayConnectionId ||
          planStop.overnightStayConnectionVersionId
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'overnightStay stops cannot include segment or overnightStayConnection references',
          );
        }
        if (index === 0) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStay is not allowed on the first stop');
        }
        const currentDayOrder = planStop.overnightStayDayOrder;
        const firstDayOrder = overnightStayDayOrders[0];
        const lastDayOrder = overnightStayDayOrders[overnightStayDayOrders.length - 1];
        const previousStop = normalizedStops[index - 1];
        const nextStop = normalizedStops[index + 1];

        if (currentDayOrder === firstDayOrder) {
          if (
            !nextStop ||
            nextStop.overnightStayId !== planStop.overnightStayId ||
            nextStop.overnightStayDayOrder !== currentDayOrder + 1
          ) {
            throw new DomainError(
              'VALIDATION_FAILED',
              `overnightStay day ${currentDayOrder} must be followed by matching day ${currentDayOrder + 1}`,
            );
          }
        } else if (
          !previousStop ||
          previousStop.overnightStayId !== planStop.overnightStayId ||
          previousStop.overnightStayDayOrder !== currentDayOrder - 1
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            `overnightStay day ${currentDayOrder} must follow matching day ${currentDayOrder - 1}`,
          );
        }

        if (currentDayOrder !== lastDayOrder) {
          if (
            !nextStop ||
            nextStop.overnightStayId !== planStop.overnightStayId ||
            nextStop.overnightStayDayOrder !== currentDayOrder + 1
          ) {
            throw new DomainError(
              'VALIDATION_FAILED',
              `overnightStay day ${currentDayOrder} must be followed by matching day ${currentDayOrder + 1}`,
            );
          }
        }
        return;
      }
      if (index === 0) {
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'segmentId is not allowed on the first stop');
        }
        if (planStop.overnightStayConnectionId || planStop.overnightStayConnectionVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId is not allowed on the first stop');
        }
        return;
      }

      const previousStop = normalizedStops[index - 1];
      const previousOvernightStayDayOrders =
        previousStop?.overnightStayId ? overnightStayDayOrdersById.get(previousStop.overnightStayId) ?? [] : [];
      const previousIsLastOvernightStayDay =
        previousStop?.overnightStayId !== undefined &&
        previousStop?.overnightStayDayOrder === previousOvernightStayDayOrders[previousOvernightStayDayOrders.length - 1];
      const currentLocationId = planStop.locationId;
      const previousLocationId = previousStop?.locationId;
      if (planStop.overnightStayConnectionId) {
        if (!previousIsLastOvernightStayDay) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'overnightStayConnectionId requires the previous stop to be the last overnightStay day',
          );
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId cannot be combined with segmentId');
        }
        const overnightStayConnection = overnightStayConnectionById.get(planStop.overnightStayConnectionId);
        if (!overnightStayConnection) {
          throw new DomainError('VALIDATION_FAILED', 'One or more overnightStayConnectionId values are invalid');
        }
        if (!currentLocationId) {
          throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionId requires locationId');
        }
        if (
          overnightStayConnection.fromOvernightStayId !== previousStop?.overnightStayId ||
          overnightStayConnection.toLocationId !== currentLocationId
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'overnightStayConnectionId must match the previous overnight stay and current stop location',
          );
        }
        return;
      }
      if (planStop.overnightStayConnectionVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'overnightStayConnectionVersionId requires overnightStayConnectionId');
      }
      if (previousIsLastOvernightStayDay) {
        throw new DomainError(
          'VALIDATION_FAILED',
          'the stop after the last overnightStay day requires overnightStayConnectionId',
        );
      }
      if (!planStop.segmentId) {
        return;
      }
      const segment = segmentById.get(planStop.segmentId);
      if (!segment) {
        throw new DomainError('VALIDATION_FAILED', 'One or more segmentId values are invalid');
      }
      if (!previousLocationId || !currentLocationId) {
        throw new DomainError('VALIDATION_FAILED', 'segmentId requires consecutive stops with location references');
      }
      if (segment.fromLocationId !== previousLocationId || segment.toLocationId !== currentLocationId) {
        throw new DomainError('VALIDATION_FAILED', 'segmentId must match the previous and current stop locations');
      }
    });

    return normalizedStops;
  }

  private formatDocumentDatePart(value: string): string {
    const date = new Date(value);
    const yy = String(date.getUTCFullYear()).slice(-2);
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  private async generatePlanDocumentNumberBase(travelStartDate: string): Promise<string> {
    const datePart = this.formatDocumentDatePart(travelStartDate);

    for (let retry = 0; retry < 10; retry += 1) {
      const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const candidate = `${datePart}${randomPart}`;
      const existing = await this.prisma.plan.findUnique({
        where: { documentNumberBase: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }

    throw new DomainError('INTERNAL', 'Failed to allocate unique document number');
  }

  private buildVersionDocumentNumber(documentNumberBase: string, versionNumber: number): string {
    return `${documentNumberBase}V${versionNumber}`;
  }

  listUsers() {
    return new PlanRepository(this.prisma).findUsers();
  }

  getUser(id: string) {
    return new PlanRepository(this.prisma).findUserById(id);
  }

  async listUserNotes(userId: string) {
    const existing = await new PlanRepository(this.prisma).findUserById(userId);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }

    return new PlanRepository(this.prisma).findUserNotes(userId);
  }

  async createUser(input: UserCreateDto) {
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid user input');
    }

    await this.validateOwnerEmployeeId(parsed.data.ownerEmployeeId);
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

    await this.validateOwnerEmployeeId(parsed.data.ownerEmployeeId);
    return new PlanRepository(this.prisma).updateUser(id, parsed.data);
  }

  deleteUser(id: string) {
    return new PlanRepository(this.prisma).deleteUser(id);
  }

  async createUserNote(input: UserNoteCreateDto) {
    const parsed = userNoteCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid user note input');
    }

    const existing = await new PlanRepository(this.prisma).findUserById(parsed.data.userId);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }

    return new PlanRepository(this.prisma).createUserNote(parsed.data);
  }

  async listUserDealTodos(input: UserDealTodosQueryDto) {
    const parsed = userDealTodosQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid user deal todo query');
    }

    const existing = await new PlanRepository(this.prisma).findUserById(parsed.data.userId);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }

    return new PlanRepository(this.prisma).findUserDealTodos(parsed.data.userId, parsed.data.includeDone);
  }

  async updateUserDealTodoStatus(input: UserDealTodoStatusUpdateDto) {
    const parsed = userDealTodoStatusUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid user deal todo status input');
    }

    const existing = await this.prisma.userDealTodo.findUnique({
      where: { id: parsed.data.id },
      select: { id: true },
    });

    if (!existing) {
      throw new DomainError('NOT_FOUND', 'User deal todo not found');
    }

    return new PlanRepository(this.prisma).updateUserDealTodoStatus(parsed.data.id, parsed.data.status);
  }

  async reorderDealPipeline(input: DealPipelineReorderDto) {
    const parsed = dealPipelineReorderSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid deal pipeline reorder input');
    }

    const userIds = parsed.data.updates.map((update) => update.userId);
    const existingUsers = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, dealStage: true },
    });

    if (existingUsers.length !== userIds.length) {
      throw new DomainError('NOT_FOUND', 'One or more users were not found');
    }

    const updates: DealPipelineCardUpdateDto[] = parsed.data.updates;
    const currentStageByUserId = new Map(existingUsers.map((user) => [user.id, user.dealStage]));
    const changedStageUpdates = updates.filter((update) => {
      const previousStage = currentStageByUserId.get(update.userId);
      return previousStage !== undefined && previousStage !== update.dealStage;
    });

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const repository = new PlanRepository(tx);
      await repository.reorderDealPipeline(updates);

      if (changedStageUpdates.length === 0) {
        return;
      }

      const changedStages = Array.from(new Set(changedStageUpdates.map((update) => update.dealStage))) as DealStage[];
      const templates = await repository.findDealTodoTemplatesByStages(changedStages);

      if (templates.length === 0) {
        return;
      }

      const todosToCreate = changedStageUpdates.flatMap((update) =>
        templates
          .filter((template) => template.stage === update.dealStage)
          .map((template) => ({
            userId: update.userId,
            stage: update.dealStage as DealStage,
            templateId: template.id,
            title: template.title,
            description: template.description ?? null,
          })),
      );

      await repository.createUserDealTodosFromTemplates(todosToCreate);
    });

    return true;
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

  private async normalizeLodgingSelections(
    regionId: string,
    totalDays: number,
    lodgingSelections: LodgingSelectionInput[],
  ): Promise<NormalizedLodgingSelection[]> {
    if (lodgingSelections.length === 0) {
      return [];
    }

    const customLodgingIds = Array.from(
      new Set(
        lodgingSelections
          .map((selection) => selection.customLodgingId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    const regionLodgings =
      customLodgingIds.length > 0
        ? await this.prisma.regionLodging.findMany({
            where: {
              id: { in: customLodgingIds },
              regionId,
            },
            select: {
              id: true,
              name: true,
              priceKrw: true,
              pricePerPersonKrw: true,
              pricePerTeamKrw: true,
            },
          })
        : [];

    if (regionLodgings.length !== customLodgingIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more customLodgingId values are invalid');
    }

    const lodgingById = new Map(regionLodgings.map((lodging) => [lodging.id, lodging]));

    return lodgingSelections.map((selection) => {
      if (selection.dayIndex > totalDays) {
        throw new DomainError('VALIDATION_FAILED', 'lodgingSelections dayIndex must be within totalDays');
      }

      if (selection.level !== 'CUSTOM') {
        return {
          ...selection,
          customLodgingNameSnapshot: null,
          pricingModeSnapshot: null,
          priceSnapshotKrw: null,
        };
      }

      const lodging = selection.customLodgingId ? lodgingById.get(selection.customLodgingId) : null;
      if (!lodging) {
        throw new DomainError('VALIDATION_FAILED', 'customLodgingId is required when level is CUSTOM');
      }

      if (lodging.pricePerPersonKrw !== null) {
        return {
          ...selection,
          customLodgingNameSnapshot: lodging.name,
          pricingModeSnapshot: 'PER_PERSON',
          priceSnapshotKrw: lodging.pricePerPersonKrw,
        };
      }

      if (lodging.pricePerTeamKrw !== null) {
        return {
          ...selection,
          customLodgingNameSnapshot: lodging.name,
          pricingModeSnapshot: 'PER_TEAM',
          priceSnapshotKrw: lodging.pricePerTeamKrw,
        };
      }

      return {
        ...selection,
        customLodgingNameSnapshot: lodging.name,
        pricingModeSnapshot: 'FLAT',
        priceSnapshotKrw: lodging.priceKrw ?? 0,
      };
    });
  }

  async previewPricing(input: PlanPricingPreviewDto) {
    const parsed = planPricingPreviewSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid pricing preview input');
    }

    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.planStops);
    const normalizedLodgingSelections = await this.normalizeLodgingSelections(
      parsed.data.regionId,
      parsed.data.totalDays,
      parsed.data.lodgingSelections,
    );

    return new PricingService(this.prisma).preview({
      ...parsed.data,
      planStops: normalizedPlanStops,
      lodgingSelections: normalizedLodgingSelections,
    });
  }

  async create(input: PlanCreateDto) {
    const parsed = planCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid plan input');
    }

    if (parsed.data.initialVersion.planStops.length !== parsed.data.initialVersion.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match planStops length');
    }

    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.initialVersion.planStops);
    const normalizedLodgingSelections = await this.normalizeLodgingSelections(
      parsed.data.regionId,
      parsed.data.initialVersion.totalDays,
      parsed.data.initialVersion.meta.lodgingSelections,
    );
    await this.validateEventIds(parsed.data.initialVersion.meta.eventIds);

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
      parsed.data.initialVersion.planStops = normalizedPlanStops;
      parsed.data.initialVersion.meta.lodgingSelections = normalizedLodgingSelections;
      const pricingResult = await new PricingService(this.prisma).computeWithTransaction(tx, {
        regionId: parsed.data.regionId,
        variantType: parsed.data.initialVersion.variantType,
        totalDays: parsed.data.initialVersion.totalDays,
        planStops: normalizedPlanStops,
        travelStartDate: parsed.data.initialVersion.meta.travelStartDate,
        headcountTotal: parsed.data.initialVersion.meta.headcountTotal,
        transportGroupCount: parsed.data.initialVersion.meta.transportGroups.length,
        vehicleType: parsed.data.initialVersion.meta.vehicleType,
        includeRentalItems: parsed.data.initialVersion.meta.includeRentalItems,
        eventIds: parsed.data.initialVersion.meta.eventIds,
        extraLodgings: parsed.data.initialVersion.meta.extraLodgings,
        lodgingSelections: normalizedLodgingSelections,
        manualAdjustments: parsed.data.initialVersion.manualAdjustments,
        manualDepositAmountKrw: parsed.data.initialVersion.manualDepositAmountKrw,
      });

      const documentNumberBase = await this.generatePlanDocumentNumberBase(parsed.data.initialVersion.meta.travelStartDate);
      const documentNumber = this.buildVersionDocumentNumber(documentNumberBase, 1);
      const repository = new PlanRepository(tx);
      const createdPlan = await repository.createWithInitialVersion(parsed.data, documentNumberBase, documentNumber);
      if (!createdPlan?.currentVersionId) {
        throw new DomainError('INTERNAL', 'Failed to resolve created plan version');
      }

      await new PricingService(this.prisma).createSnapshot(tx, createdPlan.currentVersionId, pricingResult);
      return repository.findById(createdPlan.id);
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

    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.planStops);
    const normalizedLodgingSelections = await this.normalizeLodgingSelections(
      plan.regionId,
      parsed.data.totalDays,
      parsed.data.meta.lodgingSelections,
    );
    await this.validateEventIds(parsed.data.meta.eventIds);

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
      parsed.data.planStops = normalizedPlanStops;
      parsed.data.meta.lodgingSelections = normalizedLodgingSelections;
      const pricingResult = await new PricingService(this.prisma).computeWithTransaction(tx, {
        regionId: plan.regionId,
        variantType: parsed.data.variantType,
        totalDays: parsed.data.totalDays,
        planStops: normalizedPlanStops,
        travelStartDate: parsed.data.meta.travelStartDate,
        headcountTotal: parsed.data.meta.headcountTotal,
        transportGroupCount: parsed.data.meta.transportGroups.length,
        vehicleType: parsed.data.meta.vehicleType,
        includeRentalItems: parsed.data.meta.includeRentalItems,
        eventIds: parsed.data.meta.eventIds,
        extraLodgings: parsed.data.meta.extraLodgings,
        lodgingSelections: normalizedLodgingSelections,
        manualAdjustments: parsed.data.manualAdjustments,
        manualDepositAmountKrw: parsed.data.manualDepositAmountKrw,
      });

      const repository = new PlanRepository(tx);
      const versionNumber = await repository.getNextVersionNumber(parsed.data.planId);
      const documentNumber = this.buildVersionDocumentNumber(plan.documentNumberBase, versionNumber);
      const createdVersion = await repository.createVersion(parsed.data, versionNumber, documentNumber);
      await new PricingService(this.prisma).createSnapshot(tx, createdVersion.id, pricingResult);
      return repository.findVersionById(createdVersion.id);
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
