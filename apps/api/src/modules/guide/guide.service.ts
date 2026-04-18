import type { PrismaClient } from '@prisma/client';
import { guideCreateSchema, guideUpdateSchema } from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { GuideRepository } from './guide.repository';
import type { GuideCreateDto, GuidesFilterDto, GuideUpdateDto } from './guide.types';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_CERT_IMAGE_COUNT = 20;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class GuideService {
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

  list(filters?: GuidesFilterDto) {
    return new GuideRepository(this.prisma).findMany(filters);
  }

  async get(id: string) {
    const guide = await new GuideRepository(this.prisma).findById(id);
    if (!guide) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    return guide;
  }

  async create(input: GuideCreateDto) {
    const parsed = guideCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid guide input', parsed.error);
    }
    return new GuideRepository(this.prisma).create(parsed.data);
  }

  async update(id: string, input: GuideUpdateDto) {
    const parsed = guideUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid guide update input', parsed.error);
    }
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    return new GuideRepository(this.prisma).update(id, parsed.data);
  }

  async delete(id: string) {
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    await new GuideRepository(this.prisma).delete(id);
    return true;
  }

  async uploadProfileImage(id: string, rawImage: UploadFile | Promise<UploadFile>) {
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Guide not found');
    const image = await Promise.resolve(rawImage);
    this.assertAllowedMimeType(image);
    const url = await this.getFileStorageClient().uploadImage(image, MAX_FILE_SIZE_BYTES);
    return new GuideRepository(this.prisma).update(id, { profileImageUrl: url });
  }

  async uploadCertImages(id: string, rawImages: (UploadFile | Promise<UploadFile>)[]) {
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Guide not found');
    if (rawImages.length === 0) throw new DomainError('VALIDATION_FAILED', 'At least one image is required');
    const currentUrls: string[] = Array.isArray(existing.certImageUrls) ? (existing.certImageUrls as string[]) : [];
    if (currentUrls.length + rawImages.length > MAX_CERT_IMAGE_COUNT) {
      throw new DomainError('VALIDATION_FAILED', `Total cert images cannot exceed ${MAX_CERT_IMAGE_COUNT}`);
    }
    const images = await Promise.all(rawImages.map((img) => Promise.resolve(img)));
    for (const img of images) this.assertAllowedMimeType(img);
    const client = this.getFileStorageClient();
    const newUrls = await Promise.all(images.map((img) => client.uploadImage(img, MAX_FILE_SIZE_BYTES)));
    return new GuideRepository(this.prisma).update(id, { certImageUrls: [...currentUrls, ...newUrls] });
  }

  async removeCertImage(id: string, imageUrl: string) {
    const existing = await new GuideRepository(this.prisma).findById(id);
    if (!existing) throw new DomainError('NOT_FOUND', 'Guide not found');
    const currentUrls: string[] = Array.isArray(existing.certImageUrls) ? (existing.certImageUrls as string[]) : [];
    const updated = currentUrls.filter((u) => u !== imageUrl);
    return new GuideRepository(this.prisma).update(id, { certImageUrls: updated });
  }
}
