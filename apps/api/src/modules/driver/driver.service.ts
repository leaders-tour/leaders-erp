import type { PrismaClient } from '@prisma/client';
import { driverCreateSchema, driverUpdateSchema } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { DriverRepository } from './driver.repository';
import type { DriverCreateDto, DriversFilterDto, DriverUpdateDto } from './driver.types';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_VEHICLE_IMAGE_COUNT = 20;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class DriverService {
  private fileStorageClient: FileStorageClient | null = null;

  constructor(private readonly prisma: PrismaClient) {}

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

  async uploadProfileImage(id: string, rawImage: UploadFile | Promise<UploadFile>) {
    const existing = await new DriverRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Driver not found');
    const image = await Promise.resolve(rawImage);
    this.assertAllowedMimeType(image);
    const url = await this.getFileStorageClient().uploadImage(image, MAX_FILE_SIZE_BYTES);
    return new DriverRepository(this.prisma).update(id, { profileImageUrl: url });
  }

  async uploadVehicleImages(id: string, rawImages: (UploadFile | Promise<UploadFile>)[]) {
    const existing = await new DriverRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Driver not found');
    if (rawImages.length === 0) throw new DomainError('VALIDATION_FAILED', 'At least one image is required');
    const currentUrls: string[] = Array.isArray(existing.vehicleImageUrls) ? (existing.vehicleImageUrls as string[]) : [];
    if (currentUrls.length + rawImages.length > MAX_VEHICLE_IMAGE_COUNT) {
      throw new DomainError('VALIDATION_FAILED', `Total vehicle images cannot exceed ${MAX_VEHICLE_IMAGE_COUNT}`);
    }
    const images = await Promise.all(rawImages.map((img) => Promise.resolve(img)));
    for (const img of images) this.assertAllowedMimeType(img);
    const client = this.getFileStorageClient();
    const newUrls = await Promise.all(images.map((img) => client.uploadImage(img, MAX_FILE_SIZE_BYTES)));
    return new DriverRepository(this.prisma).update(id, { vehicleImageUrls: [...currentUrls, ...newUrls] });
  }

  async removeVehicleImage(id: string, imageUrl: string) {
    const existing = await new DriverRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Driver not found');
    const currentUrls: string[] = Array.isArray(existing.vehicleImageUrls) ? (existing.vehicleImageUrls as string[]) : [];
    const updated = currentUrls.filter((u) => u !== imageUrl);
    return new DriverRepository(this.prisma).update(id, { vehicleImageUrls: updated });
  }
}
