import type { PrismaClient } from '@prisma/client';
import { segmentCreateSchema, segmentUpdateSchema } from '@tour/validation';
import { DomainError } from '../../lib/errors';
import { SegmentRepository } from './segment.repository';
import type { SegmentCreateDto, SegmentUpdateDto } from './segment.types';

export class SegmentService {
  private readonly repository: SegmentRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new SegmentRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: SegmentCreateDto) {
    const parsed = segmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid segment input');
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsed.data.regionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for segment');
    }

    return this.repository.create({ ...parsed.data, regionName: region.name });
  }

  async update(id: string, input: SegmentUpdateDto) {
    const parsed = segmentUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid segment update input');
    }

    if (!parsed.data.regionId) {
      return this.repository.update(id, parsed.data);
    }

    const region = await this.prisma.region.findUnique({
      where: { id: parsed.data.regionId },
      select: { name: true },
    });
    if (!region) {
      throw new DomainError('VALIDATION_FAILED', 'Region not found for segment update');
    }

    return this.repository.update(id, { ...parsed.data, regionName: region.name });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
