import type { PrismaClient } from '@prisma/client';
import {
  accommodationCreateSchema,
  accommodationOptionCreateSchema,
  accommodationOptionUpdateSchema,
  accommodationUpdateSchema,
} from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { AccommodationRepository } from './accommodation.repository';
import type {
  AccommodationCreateDto,
  AccommodationOptionCreateDto,
  AccommodationOptionUpdateDto,
  AccommodationsFilterDto,
  AccommodationUpdateDto,
} from './accommodation.types';

export class AccommodationService {
  private readonly repo: AccommodationRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new AccommodationRepository(prisma);
  }

  list(filters?: AccommodationsFilterDto) {
    return this.repo.findMany(filters);
  }

  async get(id: string) {
    const acc = await this.repo.findById(id);
    if (!acc) throw new DomainError('NOT_FOUND', 'Accommodation not found');
    return acc;
  }

  async create(input: AccommodationCreateDto) {
    const parsed = accommodationCreateSchema.safeParse(input);
    if (!parsed.success) throw createValidationError('Invalid accommodation input', parsed.error);
    return this.repo.create(parsed.data);
  }

  async update(id: string, input: AccommodationUpdateDto) {
    const parsed = accommodationUpdateSchema.safeParse(input);
    if (!parsed.success) throw createValidationError('Invalid accommodation update', parsed.error);
    const existing = await this.repo.findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Accommodation not found');
    return this.repo.update(id, parsed.data);
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Accommodation not found');
    await this.repo.delete(id);
    return true;
  }

  listOptions(accommodationId: string) {
    return this.repo.findOptionsByAccommodationId(accommodationId);
  }

  async getOption(id: string) {
    const opt = await this.repo.findOptionById(id);
    if (!opt) throw new DomainError('NOT_FOUND', 'AccommodationOption not found');
    return opt;
  }

  async createOption(input: AccommodationOptionCreateDto) {
    const parsed = accommodationOptionCreateSchema.safeParse(input);
    if (!parsed.success) throw createValidationError('Invalid option input', parsed.error);
    const acc = await this.repo.findById(parsed.data.accommodationId);
    if (!acc) throw new DomainError('NOT_FOUND', 'Accommodation not found');
    return this.repo.createOption(parsed.data);
  }

  async updateOption(id: string, input: AccommodationOptionUpdateDto) {
    const parsed = accommodationOptionUpdateSchema.safeParse(input);
    if (!parsed.success) throw createValidationError('Invalid option update', parsed.error);
    const existing = await this.repo.findOptionById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'AccommodationOption not found');
    return this.repo.updateOption(id, parsed.data);
  }

  async deleteOption(id: string) {
    const existing = await this.repo.findOptionById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'AccommodationOption not found');
    await this.repo.deleteOption(id);
    return true;
  }
}
