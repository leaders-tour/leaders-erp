import type { PrismaClient } from '@prisma/client';
import { regionCreateSchema, regionUpdateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import { RegionSetService } from '../region-set/region-set.service';
import { regionInclude } from './region.mapper';
import { RegionRepository } from './region.repository';
import type { RegionCreateDto, RegionUpdateDto } from './region.types';

export class RegionService {
  private readonly repository: RegionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new RegionRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  create(input: RegionCreateDto) {
    const parsed = regionCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region input', parsed.error);
    }

    return this.prisma.$transaction(async (tx) => {
      const region = await tx.region.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
        },
      });
      await RegionSetService.createSingletonForRegion(tx, region.id, region.name);
      return tx.region.findUniqueOrThrow({
        where: { id: region.id },
        include: regionInclude,
      });
    });
  }

  async update(id: string, input: RegionUpdateDto) {
    const parsed = regionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region update input', parsed.error);
    }

    if (!parsed.data.name) {
      return this.repository.update(id, parsed.data);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.region.update({
        where: { id },
        data: parsed.data,
        include: regionInclude,
      });

      await tx.location.updateMany({
        where: { regionId: id },
        data: { regionName: updated.name },
      });
      await tx.segment.updateMany({
        where: { regionId: id },
        data: { regionName: updated.name },
      });

      return updated;
    });
  }

  private getDeleteBlockingEntries(
    summary: {
      planCount: number;
      planVersionCount: number;
      templateCount: number;
      locationCount: number;
      segmentCount: number;
      overnightStayCount: number;
      overnightStayConnectionCount: number;
      regionLodgingCount: number;
    },
  ): Array<{ label: string; count: number }> {
    return [
      { label: '플랜', count: summary.planCount },
      { label: '플랜 버전', count: summary.planVersionCount },
      { label: '플랜 템플릿', count: summary.templateCount },
      { label: '목적지', count: summary.locationCount },
      { label: '구간 연결(Segment)', count: summary.segmentCount },
      { label: '연속 일정 블록', count: summary.overnightStayCount },
      { label: '블록 후속 연결', count: summary.overnightStayConnectionCount },
      { label: '지역 숙소 정책', count: summary.regionLodgingCount },
    ].filter((entry) => entry.count > 0);
  }

  async delete(id: string): Promise<boolean> {
    const inComposite = await this.prisma.regionSetItem.findFirst({
      where: { regionId: id, regionSetId: { not: id } },
      select: { id: true },
    });
    if (inComposite) {
      throw new DomainError(
        'VALIDATION_FAILED',
        '다른 지역 세트에 포함된 지역은 삭제할 수 없습니다. 해당 세트에서 먼저 제외해 주세요.',
      );
    }

    const [
      planCount,
      planVersionCount,
      templateCount,
      locationCount,
      segmentCount,
      overnightStayCount,
      overnightStayConnectionCount,
      regionLodgingCount,
    ] = await Promise.all([
      this.prisma.plan.count({ where: { regionSetId: id } }),
      this.prisma.planVersion.count({ where: { regionSetId: id } }),
      this.prisma.planTemplate.count({ where: { regionSetId: id } }),
      this.prisma.location.count({ where: { regionId: id } }),
      this.prisma.segment.count({ where: { regionId: id } }),
      this.prisma.overnightStay.count({ where: { regionId: id } }),
      this.prisma.overnightStayConnection.count({ where: { regionId: id } }),
      this.prisma.regionLodging.count({ where: { regionId: id } }),
    ]);

    const blockingEntries = this.getDeleteBlockingEntries({
      planCount,
      planVersionCount,
      templateCount,
      locationCount,
      segmentCount,
      overnightStayCount,
      overnightStayConnectionCount,
      regionLodgingCount,
    });

    if (blockingEntries.length > 0) {
      const bulletLines = blockingEntries.map((entry) => `- ${entry.label} ${entry.count}건`);
      const message = [
        '다른 데이터와 연결된 지역은 삭제할 수 없습니다.',
        ...bulletLines,
        '위 연결을 먼저 정리한 뒤 다시 시도해 주세요.',
      ].join('\n');
      throw new DomainError(
        'VALIDATION_FAILED',
        message,
        Object.fromEntries(blockingEntries.map((entry) => [entry.label, String(entry.count)])),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.region.update({
        where: { id },
        data: { defaultRegionSetId: null },
      });

      await tx.regionSet.delete({ where: { id } });
      await tx.region.delete({ where: { id } });
    });

    return true;
  }
}
