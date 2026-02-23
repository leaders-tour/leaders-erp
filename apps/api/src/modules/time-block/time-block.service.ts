import type { PrismaClient } from '@prisma/client';
import { timeBlockCreateSchema, timeBlockUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { TimeBlockRepository } from './time-block.repository';
import type { TimeBlockCreateDto, TimeBlockUpdateDto } from './time-block.types';

export class TimeBlockService {
  private readonly repository: TimeBlockRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new TimeBlockRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: TimeBlockCreateDto) {
    const parsed = timeBlockCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid time block input');
    }

    let locationId = parsed.data.locationId;
    let locationVersionId = parsed.data.locationVersionId;

    if (!locationVersionId && locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { currentVersionId: true },
      });

      if (!location?.currentVersionId) {
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required for time block');
      }
      locationVersionId = location.currentVersionId;
    }

    if (locationVersionId) {
      const version = await this.prisma.locationVersion.findUnique({
        where: { id: locationVersionId },
        select: { locationId: true },
      });

      if (!version) {
        throw new DomainError('VALIDATION_FAILED', 'LocationVersion not found for time block');
      }

      if (locationId && version.locationId !== locationId) {
        throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId mismatch');
      }

      locationId = version.locationId;
    }

    if (!locationId || !locationVersionId) {
      throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId are required');
    }

    return this.repository.create({
      ...parsed.data,
      locationId,
      locationVersionId,
    });
  }

  async update(id: string, input: TimeBlockUpdateDto) {
    const parsed = timeBlockUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid time block update input');
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
        throw new DomainError('VALIDATION_FAILED', 'Location currentVersion is required for time block update');
      }
      locationVersionId = location.currentVersionId;
    }

    if (locationVersionId) {
      const version = await this.prisma.locationVersion.findUnique({
        where: { id: locationVersionId },
        select: { locationId: true },
      });

      if (!version) {
        throw new DomainError('VALIDATION_FAILED', 'LocationVersion not found for time block update');
      }

      if (locationId && version.locationId !== locationId) {
        throw new DomainError('VALIDATION_FAILED', 'locationId and locationVersionId mismatch');
      }

      locationId = version.locationId;
    }

    return this.repository.update(id, {
      ...parsed.data,
      ...(locationId ? { locationId } : {}),
      ...(locationVersionId ? { locationVersionId } : {}),
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
