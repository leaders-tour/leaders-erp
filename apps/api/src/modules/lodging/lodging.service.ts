import type { Prisma, PrismaClient } from '@prisma/client';
import { lodgingCreateSchema, lodgingUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { LodgingRepository } from './lodging.repository';
import type { LodgingCreateDto, LodgingUpdateDto } from './lodging.types';

type FacilityAvailability = 'YES' | 'LIMITED' | 'NO';

function normalizeLodgingInput<
  T extends {
    isUnspecified?: boolean;
    hasElectricity?: FacilityAvailability;
    hasShower?: FacilityAvailability;
    hasInternet?: FacilityAvailability;
  },
>(input: T) {
  const isUnspecified = input.isUnspecified ?? false;
  return {
    ...input,
    isUnspecified,
    hasElectricity: isUnspecified ? 'NO' : (input.hasElectricity ?? 'NO'),
    hasShower: isUnspecified ? 'NO' : (input.hasShower ?? 'NO'),
    hasInternet: isUnspecified ? 'NO' : (input.hasInternet ?? 'NO'),
  };
}

function coerceLocationNameSnapshot(value: Prisma.JsonValue | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((line): line is string => typeof line === 'string').map((line) => line.trim()).filter((line) => line.length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

export class LodgingService {
  private readonly repository: LodgingRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new LodgingRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: LodgingCreateDto) {
    const parsed = lodgingCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid lodging input');
    }

    let locationId = parsed.data.locationId;
    let locationVersionId = parsed.data.locationVersionId;

    if (!locationVersionId && locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { currentVersionId: true },
      });
      if (!location?.currentVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required for lodging');
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
        throw new DomainError('VALIDATION_FAILED', 'LocationVersion not found for lodging');
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
      ...normalizeLodgingInput(parsed.data),
      locationId,
      locationVersionId,
      locationNameSnapshot: locationNameSnapshot ?? [],
    });
  }

  async update(id: string, input: LodgingUpdateDto) {
    const parsed = lodgingUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid lodging update input');
    }

    if (!parsed.data.locationId && !parsed.data.locationVersionId) {
      return this.repository.update(id, normalizeLodgingInput(parsed.data));
    }

    let locationId = parsed.data.locationId;
    let locationVersionId = parsed.data.locationVersionId;

    if (!locationVersionId && locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { currentVersionId: true },
      });
      if (!location?.currentVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required for lodging update');
      }
      locationVersionId = location.currentVersionId;
    }

    if (!locationVersionId) {
      return this.repository.update(id, normalizeLodgingInput(parsed.data));
    }

    const version = await this.prisma.locationVersion.findUnique({
      where: { id: locationVersionId },
      select: { locationId: true, locationNameSnapshot: true },
    });

    if (!version) {
      throw new DomainError('VALIDATION_FAILED', 'LocationVersion not found for lodging update');
    }

    if (locationId && version.locationId !== locationId) {
      throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId mismatch');
    }

    return this.repository.update(id, {
      ...normalizeLodgingInput(parsed.data),
      locationId: version.locationId,
      locationVersionId,
      locationNameSnapshot: coerceLocationNameSnapshot(version.locationNameSnapshot),
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
