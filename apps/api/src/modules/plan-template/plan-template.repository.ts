import type { Prisma, PrismaClient } from '@prisma/client';
import { planTemplateInclude } from './plan-template.mapper';
import type { PlanTemplateCreateDto, PlanTemplateUpdateDto } from './plan-template.types';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

interface PlanTemplateListFilter {
  regionId?: string;
  totalDays?: number;
  activeOnly?: boolean;
}

export class PlanTemplateRepository {
  constructor(private readonly prisma: PrismaLike) {}

  findMany(filter: PlanTemplateListFilter) {
    return this.prisma.planTemplate.findMany({
      where: {
        ...(filter.regionId ? { regionId: filter.regionId } : {}),
        ...(typeof filter.totalDays === 'number' ? { totalDays: filter.totalDays } : {}),
        ...(filter.activeOnly ? { isActive: true } : {}),
      },
      include: planTemplateInclude,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.planTemplate.findUnique({ where: { id }, include: planTemplateInclude });
  }

  create(data: Omit<PlanTemplateCreateDto, 'planStops'>) {
    return this.prisma.planTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        regionId: data.regionId,
        totalDays: data.totalDays,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
      include: planTemplateInclude,
    });
  }

  update(id: string, data: Omit<PlanTemplateUpdateDto, 'planStops'>) {
    return this.prisma.planTemplate.update({
      where: { id },
      data,
      include: planTemplateInclude,
    });
  }

  async replaceStops(planTemplateId: string, stops: PlanTemplateCreateDto['planStops']) {
    await this.prisma.planTemplateStop.deleteMany({ where: { planTemplateId } });
    await this.prisma.planTemplateStop.createMany({
      data: stops.map((stop) => ({
        planTemplateId,
        dayIndex: stop.dayIndex,
        segmentId: stop.segmentId,
        locationId: stop.locationId,
        locationVersionId: stop.locationVersionId,
        dateCellText: stop.dateCellText,
        destinationCellText: stop.destinationCellText,
        timeCellText: stop.timeCellText,
        scheduleCellText: stop.scheduleCellText,
        lodgingCellText: stop.lodgingCellText,
        mealCellText: stop.mealCellText,
      })),
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.planTemplate.delete({ where: { id } });
    return true;
  }
}
