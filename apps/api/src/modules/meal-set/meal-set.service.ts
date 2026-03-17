import type { Prisma, PrismaClient } from '@prisma/client';
import { mealSetCreateSchema, mealSetUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { MealSetRepository } from './meal-set.repository';
import type { MealSetCreateDto, MealSetUpdateDto } from './meal-set.types';

function coerceLocationNameSnapshot(value: Prisma.JsonValue | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((line): line is string => typeof line === 'string').map((line) => line.trim()).filter((line) => line.length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

export class MealSetService {
  private readonly repository: MealSetRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new MealSetRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: MealSetCreateDto) {
    const parsed = mealSetCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid meal set input');
    }

    let locationId = parsed.data.locationId;
    let locationVersionId = parsed.data.locationVersionId;

    if (!locationVersionId && locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { currentVersionId: true },
      });
      if (!location?.currentVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required for meal set');
      }
      locationVersionId = location.currentVersionId;
    }

    let locationNameSnapshot: string[] | null = null;

    if (locationVersionId) {
      const version = await this.prisma.locationVersion.findUnique({
        where: { id: locationVersionId },
        select: { locationId: true, locationNameSnapshot: true },
      });

      if (!version) {
        throw new DomainError('VALIDATION_FAILED', 'LocationVersion not found for meal set');
      }

      if (locationId && version.locationId !== locationId) {
        throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId mismatch');
      }

      locationId = version.locationId;
      locationNameSnapshot = coerceLocationNameSnapshot(version.locationNameSnapshot);
    }

    if (!locationId || !locationVersionId) {
      throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId are required');
    }

    return this.repository.create({
      ...parsed.data,
      locationId,
      locationVersionId,
      locationNameSnapshot: locationNameSnapshot ?? [],
    });
  }

  async update(id: string, input: MealSetUpdateDto) {
    const parsed = mealSetUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid meal set update input');
    }

    if (!parsed.data.locationId && !parsed.data.locationVersionId) {
      return this.repository.update(id, parsed.data);
    }

    let locationId = parsed.data.locationId;
    let locationVersionId = parsed.data.locationVersionId;

    if (!locationVersionId && locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { currentVersionId: true },
      });
      if (!location?.currentVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required for meal set update');
      }
      locationVersionId = location.currentVersionId;
    }

    if (!locationVersionId) {
      return this.repository.update(id, parsed.data);
    }

    const version = await this.prisma.locationVersion.findUnique({
      where: { id: locationVersionId },
      select: { locationId: true, locationNameSnapshot: true },
    });

    if (!version) {
      throw new DomainError('VALIDATION_FAILED', 'LocationVersion not found for meal set update');
    }

    if (locationId && version.locationId !== locationId) {
      throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId mismatch');
    }

    return this.repository.update(id, {
      ...parsed.data,
      locationId: version.locationId,
      locationVersionId,
      locationNameSnapshot: coerceLocationNameSnapshot(version.locationNameSnapshot),
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
