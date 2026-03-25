import type { Prisma, PrismaClient } from '@prisma/client';
import { regionSetCreateSchema } from '@tour/validation';
import { createValidationError, DomainError } from '../../lib/errors';
import {
  buildRegionSetSignature,
  canonicalizeRegionIds,
  formatRegionSetName,
  uniqueRegionIdsPreserveOrder,
} from '../../lib/region-set-utils';
import { regionSetListInclude } from './region-set.mapper';

type Db = PrismaClient | Prisma.TransactionClient;

export class RegionSetService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 단일 지역 세트(아이템 1개)를 복합 세트보다 먼저 노출한다. 그 안에서는 이름·id 순.
   */
  private sortRegionSetsForDisplay<
    T extends { id: string; name: string; items: readonly unknown[] },
  >(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
      const aSingleton = a.items.length === 1 ? 0 : 1;
      const bSingleton = b.items.length === 1 ? 0 : 1;
      if (aSingleton !== bSingleton) {
        return aSingleton - bSingleton;
      }
      const byName = a.name.localeCompare(b.name, 'ko');
      if (byName !== 0) {
        return byName;
      }
      return a.id.localeCompare(b.id);
    });
  }

  async list(includeInactive = false) {
    const rows = await this.prisma.regionSet.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: regionSetListInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return this.sortRegionSetsForDisplay(rows);
  }

  get(id: string) {
    return this.prisma.regionSet.findUnique({
      where: { id },
      include: regionSetListInclude,
    });
  }

  /**
   * Composite set: create or return existing by signature.
   * Single region: returns that region's default singleton set (no duplicate row).
   */
  async createFromRegionIds(input: { regionIds: string[] }) {
    const parsed = regionSetCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid region set input', parsed.error);
    }

    const orderedUnique = uniqueRegionIdsPreserveOrder(parsed.data.regionIds);
    if (orderedUnique.length === 0) {
      throw new DomainError('VALIDATION_FAILED', 'regionIds must not be empty');
    }

    const canonicalIds = canonicalizeRegionIds(orderedUnique);

    if (orderedUnique.length === 1) {
      const region = await this.prisma.region.findUnique({
        where: { id: orderedUnique[0] },
        select: { id: true, defaultRegionSetId: true },
      });
      if (!region?.defaultRegionSetId) {
        throw new DomainError('NOT_FOUND', 'Region not found or has no default region set');
      }
      const set = await this.get(region.defaultRegionSetId);
      if (!set) {
        throw new DomainError('INTERNAL', 'Default region set missing');
      }
      return set;
    }

    const signature = buildRegionSetSignature(canonicalIds);
    const existing = await this.prisma.regionSet.findUnique({
      where: { signature },
      include: regionSetListInclude,
    });
    if (existing && existing.deletedAt == null) {
      return existing;
    }
    if (existing?.deletedAt != null) {
      throw new DomainError('VALIDATION_FAILED', 'A soft-deleted set with this combination exists; create a new combination name via support');
    }

    const regions = await this.prisma.region.findMany({
      where: { id: { in: canonicalIds } },
      select: { id: true, name: true },
    });
    if (regions.length !== canonicalIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'One or more regionIds are invalid');
    }

    const nameById = new Map(regions.map((r) => [r.id, r.name] as const));
    const orderedNames = orderedUnique.map((id) => nameById.get(id) ?? id);
    const name = formatRegionSetName(orderedNames);

    return this.prisma.regionSet.create({
      data: {
        signature,
        name,
        items: {
          create: orderedUnique.map((regionId, sortOrder) => ({
            regionId,
            sortOrder,
          })),
        },
      },
      include: regionSetListInclude,
    });
  }

  async softDelete(id: string): Promise<boolean> {
    const set = await this.prisma.regionSet.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!set) {
      throw new DomainError('NOT_FOUND', 'Region set not found');
    }
    if (set.deletedAt) {
      return true;
    }

    const [planCount, templateCount] = await Promise.all([
      this.prisma.plan.count({ where: { regionSetId: id } }),
      this.prisma.planTemplate.count({ where: { regionSetId: id } }),
    ]);
    if (planCount > 0 || templateCount > 0) {
      throw new DomainError('VALIDATION_FAILED', 'Cannot delete region set while plans or templates reference it');
    }

    if (await this.isDefaultSingletonSet(id)) {
      throw new DomainError('VALIDATION_FAILED', 'Cannot delete a region default singleton set');
    }

    await this.prisma.regionSet.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return true;
  }

  private async isDefaultSingletonSet(regionSetId: string): Promise<boolean> {
    const row = await this.prisma.region.findFirst({
      where: { defaultRegionSetId: regionSetId },
      select: { id: true },
    });
    return row != null;
  }

  /** Used when creating a new Region: singleton set with same id as region. */
  static async createSingletonForRegion(tx: Db, regionId: string, regionName: string): Promise<void> {
    await tx.regionSet.create({
      data: {
        id: regionId,
        signature: regionId,
        name: regionName,
        items: {
          create: [{ regionId, sortOrder: 0 }],
        },
      },
    });
    await tx.region.update({
      where: { id: regionId },
      data: { defaultRegionSetId: regionId },
    });
  }
}
