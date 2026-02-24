import type { PrismaClient } from '@prisma/client';
import { locationGuideCreateSchema, locationGuideUpdateSchema } from '@tour/validation';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { DomainError } from '../../lib/errors';
import { LocationGuideRepository } from './location-guide.repository';
import type { FileUploadLike, LocationGuideCreateDto, LocationGuideUpdateDto } from './location-guide.types';

const MAX_IMAGE_COUNT = 20;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class LocationGuideService {
  private readonly repository: LocationGuideRepository;
  private fileStorageClient: FileStorageClient | null = null;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new LocationGuideRepository(prisma);
  }

  list() {
    return this.repository.findMany();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  async create(input: LocationGuideCreateDto) {
    const parsed = locationGuideCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location guide input');
    }

    const locationId = parsed.data.locationId.trim();
    await this.assertLocationAvailable(locationId);

    return this.repository.create({
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      imageUrls: await this.uploadImages(parsed.data.images as FileUploadLike[]),
      locationId,
    });
  }

  async update(id: string, input: LocationGuideUpdateDto) {
    const parsed = locationGuideUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid location guide update input');
    }

    const current = await this.repository.findById(id);
    if (!current) {
      throw new DomainError('NOT_FOUND', 'Location guide not found');
    }

    if (parsed.data.locationId && parsed.data.locationId !== current.locationId) {
      throw new DomainError('VALIDATION_FAILED', 'Use connectLocationGuide/disconnectLocationGuide to change location link');
    }

    return this.repository.update(id, {
      title: parsed.data.title?.trim(),
      description: parsed.data.description?.trim(),
      imageUrls: parsed.data.images ? await this.uploadImages(parsed.data.images as FileUploadLike[]) : undefined,
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

  async connect(locationId: string, guideId: string) {
    const [location, guide] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: locationId }, select: { id: true, guide: { select: { id: true } } } }),
      this.repository.findById(guideId),
    ]);

    if (!location) {
      throw new DomainError('NOT_FOUND', 'Location not found');
    }
    if (!guide) {
      throw new DomainError('NOT_FOUND', 'Location guide not found');
    }
    if (guide.locationId) {
      throw new DomainError('VALIDATION_FAILED', 'Guide is already connected to a location');
    }
    if (location.guide) {
      throw new DomainError('VALIDATION_FAILED', 'Location already has a guide');
    }

    return this.repository.update(guideId, { locationId });
  }

  async disconnect(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, guide: { select: { id: true } } },
    });
    if (!location) {
      throw new DomainError('NOT_FOUND', 'Location not found');
    }
    if (!location.guide) {
      return null;
    }

    return this.repository.update(location.guide.id, { locationId: null });
  }

  private async assertLocationAvailable(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, guide: { select: { id: true } } },
    });
    if (!location) {
      throw new DomainError('VALIDATION_FAILED', 'Location not found');
    }
    if (location.guide) {
      throw new DomainError('VALIDATION_FAILED', 'Location already has a guide');
    }
  }

  private async uploadImages(inputs: FileUploadLike[]): Promise<string[]> {
    if (inputs.length === 0) {
      throw new DomainError('VALIDATION_FAILED', 'At least one image is required');
    }
    if (inputs.length > MAX_IMAGE_COUNT) {
      throw new DomainError('VALIDATION_FAILED', `Image count exceeds limit (${MAX_IMAGE_COUNT})`);
    }

    const files = await Promise.all(inputs.map((input) => Promise.resolve(input)));
    this.assertAllowedMimeTypes(files);
    const client = this.getFileStorageClient();
    return Promise.all(files.map((file) => client.uploadImage(file, MAX_FILE_SIZE_BYTES)));
  }

  private assertAllowedMimeTypes(files: UploadFile[]) {
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new DomainError('VALIDATION_FAILED', `Unsupported file type: ${file.mimetype}`);
      }
    }
  }

  private getFileStorageClient(): FileStorageClient {
    if (!this.fileStorageClient) {
      this.fileStorageClient = new FileStorageClient();
    }
    return this.fileStorageClient;
  }
}
