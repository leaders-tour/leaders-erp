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
import { createValidationError, DomainError } from '../../lib/errors';
import { resolveRegionSetRegionIds } from '../../lib/resolve-region-set';
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

type PlanStopRowType = 'MAIN' | 'EXTERNAL_TRANSFER';

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

  private isExternalTransferPlanStop<T extends { rowType?: PlanStopRowType | null }>(planStop: T): boolean {
    return planStop.rowType === 'EXTERNAL_TRANSFER';
  }

  private countMainPlanStops<T extends { rowType?: PlanStopRowType | null }>(planStops: T[]): number {
    return planStops.reduce((count, planStop) => count + (this.isExternalTransferPlanStop(planStop) ? 0 : 1), 0);
  }

  private filterMainPlanStops<T extends { rowType?: PlanStopRowType | null }>(planStops: T[]): T[] {
    return planStops.filter((planStop) => !this.isExternalTransferPlanStop(planStop));
  }

  private async normalizePlanStopsWithLocationReferences<
    T extends {
      rowType?: PlanStopRowType | null;
      segmentId?: string;
      segmentVersionId?: string;
      multiDayBlockId?: string;
      multiDayBlockDayOrder?: number;
      multiDayBlockConnectionId?: string;
      multiDayBlockConnectionVersionId?: string;
      locationId?: string;
      locationVersionId?: string;
    },
  >(
    planStops: T[],
  ): Promise<T[]> {
    const mainPlanStops = this.filterMainPlanStops(planStops);
    const locationVersionIds = Array.from(
      new Set(
        mainPlanStops
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
        this.filterMainPlanStops(normalizedStops)
          .map((planStop) => planStop.segmentId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const segmentVersionIds = Array.from(
      new Set(
        this.filterMainPlanStops(normalizedStops)
          .map((planStop) => planStop.segmentVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const blockIds = Array.from(
      new Set(
        this.filterMainPlanStops(normalizedStops)
          .map((planStop) => planStop.multiDayBlockId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const blockConnectionIds = Array.from(
      new Set(
        this.filterMainPlanStops(normalizedStops)
          .map((planStop) => planStop.multiDayBlockConnectionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    const blockConnectionVersionIds = Array.from(
      new Set(
        this.filterMainPlanStops(normalizedStops)
          .map((planStop) => planStop.multiDayBlockConnectionVersionId)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );
    if (
      segmentIds.length === 0 &&
      segmentVersionIds.length === 0 &&
      blockIds.length === 0 &&
      blockConnectionIds.length === 0 &&
      blockConnectionVersionIds.length === 0
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
      blockIds.length > 0
        ? await this.prisma.overnightStay.findMany({
            where: { id: { in: blockIds } },
            select: {
              id: true,
              locationId: true,
              startLocationId: true,
              endLocationId: true,
              days: { select: { dayOrder: true, displayLocationId: true } },
            },
          })
        : [];
    if (overnightStays.length !== blockIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockId values are invalid');
    }
    const blockConnections =
      blockConnectionIds.length > 0
        ? await this.prisma.overnightStayConnection.findMany({
            where: { id: { in: blockConnectionIds } },
            select: { id: true, fromOvernightStayId: true, toLocationId: true },
          })
        : [];
    if (blockConnections.length !== blockConnectionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionId values are invalid');
    }
    const blockConnectionById = new Map(blockConnections.map((connection) => [connection.id, connection]));
    const blockConnectionVersions =
      blockConnectionVersionIds.length > 0
        ? await this.prisma.overnightStayConnectionVersion.findMany({
            where: { id: { in: blockConnectionVersionIds } },
            select: { id: true, overnightStayConnectionId: true },
          })
        : [];
    if (blockConnectionVersions.length !== blockConnectionVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionVersionId values are invalid');
    }
    const blockConnectionVersionById = new Map(
      blockConnectionVersions.map((version) => [version.id, version]),
    );
    const blockById = new Map(overnightStays.map((b) => [b.id, b]));
    const blockDayOrdersById = new Map(
      overnightStays.map((b) => [b.id, b.days.map((d) => d.dayOrder).slice().sort((a, b) => a - b)]),
    );
    const blockDayDisplayLocationByIdAndOrder = new Map(
      overnightStays.flatMap((b) => b.days.map((d) => [`${b.id}:${d.dayOrder}`, d.displayLocationId])),
    );
    for (const [index, planStop] of normalizedStops.entries()) {
      if (this.isExternalTransferPlanStop(planStop)) {
        if (
          planStop.segmentId ||
          planStop.segmentVersionId ||
          planStop.multiDayBlockId ||
          planStop.multiDayBlockDayOrder !== undefined ||
          planStop.multiDayBlockConnectionId ||
          planStop.multiDayBlockConnectionVersionId ||
          planStop.locationVersionId
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'EXTERNAL_TRANSFER rows cannot include segment, block, block connection, or location version references',
          );
        }
        continue;
      }

      if (planStop.multiDayBlockConnectionVersionId) {
        if (!planStop.multiDayBlockConnectionId) {
          throw new DomainError('VALIDATION_FAILED', 'multiDayBlockConnectionVersionId requires multiDayBlockConnectionId');
        }
        const connectionVersion = blockConnectionVersionById.get(planStop.multiDayBlockConnectionVersionId);
        if (!connectionVersion) {
          throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionVersionId values are invalid');
        }
        if (connectionVersion.overnightStayConnectionId !== planStop.multiDayBlockConnectionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'multiDayBlockConnectionVersionId must belong to multiDayBlockConnectionId',
          );
        }
      }

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
      const blockId = planStop.multiDayBlockId;
      const dayOrder = planStop.multiDayBlockDayOrder;
      if (dayOrder !== undefined && !blockId) {
        throw new DomainError('VALIDATION_FAILED', 'multiDayBlockDayOrder requires multiDayBlockId');
      }
      if (blockId) {
        const block = blockById.get(blockId);
        const blockDayOrders = blockDayOrdersById.get(blockId) ?? [];
        if (!block) {
          throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockId values are invalid');
        }
        const expectedDisplayLocationId = blockDayDisplayLocationByIdAndOrder.get(`${blockId}:${dayOrder}`);
        if (
          planStop.locationId == null ||
          expectedDisplayLocationId == null ||
          expectedDisplayLocationId !== planStop.locationId
        ) {
          throw new DomainError('VALIDATION_FAILED', 'Block day row locationId must match the day displayLocationId');
        }
        if (dayOrder === undefined || !blockDayOrders.includes(dayOrder)) {
          throw new DomainError('VALIDATION_FAILED', 'multiDayBlockDayOrder must match the block days');
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block day stops cannot include segment references',
          );
        }
        if (planStop.multiDayBlockConnectionId || planStop.multiDayBlockConnectionVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'Block day stops cannot include block connection references',
          );
        }
        if (index === 0) {
          throw new DomainError('VALIDATION_FAILED', 'Block is not allowed on the first stop');
        }
        const currentDayOrder = dayOrder;
        const firstDayOrder = blockDayOrders[0];
        const lastDayOrder = blockDayOrders[blockDayOrders.length - 1];
        const previousStop = normalizedStops[index - 1];
        const nextStop = normalizedStops[index + 1];
        const prevBlockId = previousStop?.multiDayBlockId;
        const nextBlockId = nextStop?.multiDayBlockId;
        const nextDayOrder = nextStop?.multiDayBlockDayOrder;

        if (currentDayOrder === firstDayOrder) {
          if (!nextStop || nextBlockId !== blockId || nextDayOrder !== currentDayOrder + 1) {
            throw new DomainError(
              'VALIDATION_FAILED',
              `Block day ${currentDayOrder} must be followed by matching day ${currentDayOrder + 1}`,
            );
          }
        } else if (
          !previousStop ||
          prevBlockId !== blockId ||
          previousStop.multiDayBlockDayOrder !== currentDayOrder - 1
        ) {
          throw new DomainError(
            'VALIDATION_FAILED',
            `Block day ${currentDayOrder} must follow matching day ${currentDayOrder - 1}`,
          );
        }
        if (currentDayOrder !== lastDayOrder) {
          if (!nextStop || nextBlockId !== blockId || nextDayOrder !== currentDayOrder + 1) {
            throw new DomainError(
              'VALIDATION_FAILED',
              `Block day ${currentDayOrder} must be followed by matching day ${currentDayOrder + 1}`,
            );
          }
        }
        continue;
      }
      if (index === 0) {
        if (
          planStop.segmentId ||
          planStop.segmentVersionId ||
          planStop.multiDayBlockConnectionId ||
          planStop.multiDayBlockConnectionVersionId
        ) {
          throw new DomainError('VALIDATION_FAILED', 'movement references are not allowed on the first stop');
        }
        continue;
      }

      const previousStop = normalizedStops[index - 1];
      const prevBlockId = previousStop?.multiDayBlockId;
      const prevBlockDayOrders = prevBlockId ? blockDayOrdersById.get(prevBlockId) ?? [] : [];
      const previousIsLastBlockDay =
        prevBlockId != null &&
        previousStop?.multiDayBlockDayOrder === prevBlockDayOrders[prevBlockDayOrders.length - 1];
      const currentLocationId = planStop.locationId;
      const previousLocationId = previousStop?.locationId;
      if (previousIsLastBlockDay) {
        if (!planStop.multiDayBlockConnectionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day requires multiDayBlockConnectionId',
          );
        }
        if (planStop.segmentId || planStop.segmentVersionId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day must not include segment references',
          );
        }
        if (!currentLocationId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'The stop after the last block day requires a destination locationId',
          );
        }
        const blockConnection = blockConnectionById.get(planStop.multiDayBlockConnectionId);
        if (!blockConnection) {
          throw new DomainError('VALIDATION_FAILED', 'One or more multiDayBlockConnectionId values are invalid');
        }
        if (blockConnection.fromOvernightStayId !== prevBlockId || blockConnection.toLocationId !== currentLocationId) {
          throw new DomainError(
            'VALIDATION_FAILED',
            'multiDayBlockConnectionId must match the previous block and current stop location',
          );
        }
        continue;
      }
      if (planStop.multiDayBlockConnectionId || planStop.multiDayBlockConnectionVersionId) {
        throw new DomainError(
          'VALIDATION_FAILED',
          'multiDayBlockConnectionId is only allowed on the stop immediately after the last block day',
        );
      }
      if (!planStop.segmentId) {
        continue;
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
    }

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
      throw createValidationError('Invalid user input', parsed.error);
    }

    await this.validateOwnerEmployeeId(parsed.data.ownerEmployeeId);
    return new PlanRepository(this.prisma).createUser(parsed.data);
  }

  async updateUser(id: string, input: UserUpdateDto) {
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid user update input', parsed.error);
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
      throw createValidationError('Invalid user note input', parsed.error);
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
      throw createValidationError('Invalid user deal todo query', parsed.error);
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
      throw createValidationError('Invalid user deal todo status input', parsed.error);
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
      throw createValidationError('Invalid deal pipeline reorder input', parsed.error);
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
    regionIds: string[],
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
              regionId: regionIds.length === 1 ? regionIds[0]! : { in: regionIds },
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

  private async enrichPlanStopsWithBlockEndLocationId<
    T extends { multiDayBlockId?: string; multiDayBlockDayOrder?: number; blockEndLocationId?: string },
  >(planStops: T[]): Promise<T[]> {
    const blockIds = Array.from(
      new Set(
        planStops
          .map((s) => s.multiDayBlockId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    if (blockIds.length === 0) {
      return planStops;
    }
    const blocks = await this.prisma.overnightStay.findMany({
      where: { id: { in: blockIds } },
      select: { id: true, days: { select: { dayOrder: true, displayLocationId: true } } },
    });
    const lastDayOrderByBlockId = new Map(
      blocks.map((b) => [
        b.id,
        Math.max(...b.days.map((d) => d.dayOrder), 0),
      ]),
    );
    const lastDayDisplayLocationIdByBlockId = new Map(
      blocks.map((block) => {
        const lastDay = block.days.slice().sort((left, right) => right.dayOrder - left.dayOrder)[0];
        return [block.id, lastDay?.displayLocationId];
      }),
    );
    return planStops.map((stop) => {
      const blockId = stop.multiDayBlockId;
      const dayOrder = stop.multiDayBlockDayOrder;
      if (!blockId || dayOrder == null) {
        return stop;
      }
      const lastOrder = lastDayOrderByBlockId.get(blockId);
      const lastDayDisplayLocationId = lastDayDisplayLocationIdByBlockId.get(blockId);
      if (lastOrder != null && dayOrder === lastOrder && lastDayDisplayLocationId) {
        return { ...stop, blockEndLocationId: lastDayDisplayLocationId };
      }
      return stop;
    });
  }

  async previewPricing(input: PlanPricingPreviewDto) {
    const parsed = planPricingPreviewSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid pricing preview input', parsed.error);
    }

    if (this.countMainPlanStops(parsed.data.planStops) !== parsed.data.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match the number of MAIN planStops');
    }

    const regionIds = await resolveRegionSetRegionIds(this.prisma, parsed.data.regionSetId);
    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.planStops);
    const pricingPlanStops = this.filterMainPlanStops(normalizedPlanStops);
    const planStopsForPricing = await this.enrichPlanStopsWithBlockEndLocationId(pricingPlanStops);
    const normalizedLodgingSelections = await this.normalizeLodgingSelections(
      regionIds,
      parsed.data.totalDays,
      parsed.data.lodgingSelections,
    );

    const {
      regionSetId,
      variantType,
      totalDays,
      travelStartDate,
      headcountTotal,
      transportGroupCount,
      transportGroups,
      vehicleType,
      includeRentalItems,
      eventIds,
      extraLodgings,
      externalTransfers,
      manualAdjustments,
      manualDepositAmountKrw,
    } = parsed.data;

    return new PricingService(this.prisma).preview({
      regionSetId,
      regionIds,
      variantType,
      totalDays,
      planStops: planStopsForPricing,
      travelStartDate,
      headcountTotal,
      transportGroupCount,
      transportGroups,
      vehicleType,
      includeRentalItems,
      eventIds,
      extraLodgings,
      lodgingSelections: normalizedLodgingSelections,
      externalTransfers,
      manualAdjustments,
      manualDepositAmountKrw,
    });
  }

  async create(input: PlanCreateDto) {
    const parsed = planCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid plan input', parsed.error);
    }

    if (this.countMainPlanStops(parsed.data.initialVersion.planStops) !== parsed.data.initialVersion.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match the number of MAIN planStops');
    }

    const regionIds = await resolveRegionSetRegionIds(this.prisma, parsed.data.regionSetId);
    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.initialVersion.planStops);
    const normalizedLodgingSelections = await this.normalizeLodgingSelections(
      regionIds,
      parsed.data.initialVersion.totalDays,
      parsed.data.initialVersion.meta.lodgingSelections,
    );
    await this.validateEventIds(parsed.data.initialVersion.meta.eventIds);

    const [user, regionSet] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } }),
      this.prisma.regionSet.findUnique({ where: { id: parsed.data.regionSetId }, select: { id: true } }),
    ]);

    if (!user) {
      throw new DomainError('NOT_FOUND', 'User not found');
    }
    if (!regionSet) {
      throw new DomainError('NOT_FOUND', 'Region set not found');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      parsed.data.initialVersion.planStops = normalizedPlanStops;
      parsed.data.initialVersion.meta.lodgingSelections = normalizedLodgingSelections;
      const pricingPlanStops = this.filterMainPlanStops(normalizedPlanStops);
      const planStopsForPricing = await this.enrichPlanStopsWithBlockEndLocationId(pricingPlanStops);
      const pricingResult = await new PricingService(this.prisma).computeWithTransaction(tx, {
        regionSetId: parsed.data.regionSetId,
        regionIds,
        variantType: parsed.data.initialVersion.variantType,
        totalDays: parsed.data.initialVersion.totalDays,
        planStops: planStopsForPricing,
        travelStartDate: parsed.data.initialVersion.meta.travelStartDate,
        headcountTotal: parsed.data.initialVersion.meta.headcountTotal,
        transportGroupCount: parsed.data.initialVersion.meta.transportGroups.length,
        transportGroups: parsed.data.initialVersion.meta.transportGroups,
        vehicleType: parsed.data.initialVersion.meta.vehicleType,
        includeRentalItems: parsed.data.initialVersion.meta.includeRentalItems,
        eventIds: parsed.data.initialVersion.meta.eventIds,
        extraLodgings: parsed.data.initialVersion.meta.extraLodgings,
        lodgingSelections: normalizedLodgingSelections,
        externalTransfers: parsed.data.initialVersion.meta.externalTransfers,
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

      await new PricingService(this.prisma).createSnapshot(tx, {
        planVersionId: createdPlan.currentVersionId,
        result: pricingResult,
        manualPricing: parsed.data.initialVersion.manualPricing,
      });
      return repository.findById(createdPlan.id);
    });
  }

  async update(id: string, input: PlanUpdateDto) {
    const parsed = planUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid plan update input', parsed.error);
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
      throw createValidationError('Invalid plan version input', parsed.error);
    }

    if (this.countMainPlanStops(parsed.data.planStops) !== parsed.data.totalDays) {
      throw new DomainError('VALIDATION_FAILED', 'totalDays must match the number of MAIN planStops');
    }

    const plan = await new PlanRepository(this.prisma).findById(parsed.data.planId);
    if (!plan) {
      throw new DomainError('NOT_FOUND', 'Plan not found');
    }

    const regionIds = await resolveRegionSetRegionIds(this.prisma, plan.regionSetId);
    const normalizedPlanStops = await this.normalizePlanStopsWithLocationReferences(parsed.data.planStops);
    const normalizedLodgingSelections = await this.normalizeLodgingSelections(
      regionIds,
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
      const pricingPlanStops = this.filterMainPlanStops(normalizedPlanStops);
      const planStopsForPricing = await this.enrichPlanStopsWithBlockEndLocationId(pricingPlanStops);
      const pricingResult = await new PricingService(this.prisma).computeWithTransaction(tx, {
        regionSetId: plan.regionSetId,
        regionIds,
        variantType: parsed.data.variantType,
        totalDays: parsed.data.totalDays,
        planStops: planStopsForPricing,
        travelStartDate: parsed.data.meta.travelStartDate,
        headcountTotal: parsed.data.meta.headcountTotal,
        transportGroupCount: parsed.data.meta.transportGroups.length,
        transportGroups: parsed.data.meta.transportGroups,
        vehicleType: parsed.data.meta.vehicleType,
        includeRentalItems: parsed.data.meta.includeRentalItems,
        eventIds: parsed.data.meta.eventIds,
        extraLodgings: parsed.data.meta.extraLodgings,
        lodgingSelections: normalizedLodgingSelections,
        externalTransfers: parsed.data.meta.externalTransfers,
        manualAdjustments: parsed.data.manualAdjustments,
        manualDepositAmountKrw: parsed.data.manualDepositAmountKrw,
      });

      const repository = new PlanRepository(tx);
      const versionNumber = await repository.getNextVersionNumber(parsed.data.planId);
      const documentNumber = this.buildVersionDocumentNumber(plan.documentNumberBase, versionNumber);
      const createdVersion = await repository.createVersion(parsed.data, versionNumber, documentNumber);
      await new PricingService(this.prisma).createSnapshot(tx, {
        planVersionId: createdVersion.id,
        result: pricingResult,
        manualPricing: parsed.data.manualPricing,
      });
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
