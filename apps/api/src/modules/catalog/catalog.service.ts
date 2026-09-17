import type { PrismaClient } from '@prisma/client';
import {
  catalogBlockCreateSchema,
  catalogElementCreateSchema,
  catalogPlaceCreateSchema,
  type CatalogBlockCreateInput,
  type CatalogElementCreateInput,
  type CatalogPlaceCreateInput,
} from '@tour/validation';
import { createValidationError } from '../../lib/errors';
import { CatalogRepository } from './catalog.repository';

type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
type CatalogPlaceType = 'LODGING' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';

export class CatalogService {
  private readonly repository: CatalogRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new CatalogRepository(prisma);
  }

  listRegions(status?: CatalogUsageStatus) {
    return this.repository.listRegions(status);
  }

  listPlaces(status?: CatalogUsageStatus, placeType?: CatalogPlaceType) {
    return this.repository.listPlaces(status, placeType);
  }

  listRoutes(status?: CatalogUsageStatus) {
    return this.repository.listRoutes(status);
  }

  listElements(status?: CatalogUsageStatus) {
    return this.repository.listElements(status);
  }

  listBlocks(status?: CatalogUsageStatus) {
    return this.repository.listBlocks(status);
  }

  createPlace(input: CatalogPlaceCreateInput) {
    const parsed = catalogPlaceCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid catalog place input', parsed.error);
    }
    return this.repository.createPlace(parsed.data);
  }

  createElement(input: CatalogElementCreateInput) {
    const parsed = catalogElementCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid catalog element input', parsed.error);
    }
    return this.repository.createElement(parsed.data);
  }

  createBlock(input: CatalogBlockCreateInput) {
    const parsed = catalogBlockCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid catalog block input', parsed.error);
    }
    return this.repository.createBlock(parsed.data);
  }
}
