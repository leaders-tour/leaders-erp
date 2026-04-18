import type { PrismaClient } from '@prisma/client';
import {
  accommodationCreateSchema,
  accommodationOptionCreateSchema,
  accommodationOptionUpdateSchema,
  accommodationUpdateSchema,
} from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { AccommodationRepository } from './accommodation.repository';
import type {
  AccommodationCreateDto,
  AccommodationOptionCreateDto,
  AccommodationOptionUpdateDto,
  AccommodationsFilterDto,
  AccommodationUpdateDto,
} from './accommodation.types';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_OPTION_IMAGE_COUNT = 20;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class AccommodationService {
  private readonly repo: AccommodationRepository;
  private fileStorageClient: FileStorageClient | null = null;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new AccommodationRepository(prisma);
  }

  private getFileStorageClient(): FileStorageClient {
    if (!this.fileStorageClient) {
      this.fileStorageClient = new FileStorageClient();
    }
    return this.fileStorageClient;
  }

  private assertAllowedMimeType(file: UploadFile) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new DomainError('VALIDATION_FAILED', `Unsupported file type: ${file.mimetype}`);
    }
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

  async uploadOptionImages(id: string, images: UploadFile[]) {
    const existing = await this.repo.findOptionById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'AccommodationOption not found');
    if (images.length === 0) throw new DomainError('VALIDATION_FAILED', 'At least one image is required');
    const currentUrls: string[] = Array.isArray(existing.imageUrls) ? (existing.imageUrls as string[]) : [];
    if (currentUrls.length + images.length > MAX_OPTION_IMAGE_COUNT) {
      throw new DomainError('VALIDATION_FAILED', `Total images cannot exceed ${MAX_OPTION_IMAGE_COUNT}`);
    }
    for (const img of images) this.assertAllowedMimeType(img);
    const client = this.getFileStorageClient();
    const newUrls = await Promise.all(images.map((img) => client.uploadImage(img, MAX_FILE_SIZE_BYTES)));
    return this.repo.updateOption(id, { imageUrls: [...currentUrls, ...newUrls] });
  }

  async removeOptionImage(id: string, imageUrl: string) {
    const existing = await this.repo.findOptionById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'AccommodationOption not found');
    const currentUrls: string[] = Array.isArray(existing.imageUrls) ? (existing.imageUrls as string[]) : [];
    const updated = currentUrls.filter((u) => u !== imageUrl);
    return this.repo.updateOption(id, { imageUrls: updated });
  }
}
