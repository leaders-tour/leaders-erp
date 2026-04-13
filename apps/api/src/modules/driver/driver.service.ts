import type { PrismaClient } from '@prisma/client';
import { driverCreateSchema, driverUpdateSchema } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { DriverRepository } from './driver.repository';
import type { DriverCreateDto, DriversFilterDto, DriverUpdateDto } from './driver.types';

export class DriverService {
  constructor(private readonly prisma: PrismaClient) {}

  list(filters?: DriversFilterDto) {
    return new DriverRepository(this.prisma).findMany(filters);
  }

  async get(id: string) {
    const driver = await new DriverRepository(this.prisma).findById(id);
    if (!driver) throw new DomainError('NOT_FOUND', 'Driver not found');
    return driver;
  }

  async create(input: DriverCreateDto) {
    const parsed = driverCreateSchema.safeParse(input);
    if (!parsed.success) throw createValidationError('Invalid driver input', parsed.error);
    return new DriverRepository(this.prisma).create(parsed.data);
  }

  async update(id: string, input: DriverUpdateDto) {
    const parsed = driverUpdateSchema.safeParse(input);
    if (!parsed.success) throw createValidationError('Invalid driver update input', parsed.error);
    const existing = await new DriverRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Driver not found');
    return new DriverRepository(this.prisma).update(id, parsed.data);
  }

  async delete(id: string) {
    const existing = await new DriverRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Driver not found');
    await new DriverRepository(this.prisma).delete(id);
    return true;
  }
}
