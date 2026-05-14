import type { PrismaClient } from '@prisma/client';
import {
  findAnchorLineIndexInLocationName,
  normalizeGuideLocationNameLines,
  locationGuideBulkApplyAnchorSchema,
  locationGuideCreateSchema,
  locationGuideUpdateSchema,
  type GuideLocationNameLike,
  type LocationGuideBulkApplyAnchorInput,
} from '@tour/validation';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { createValidationError, DomainError } from '../../lib/errors';
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
      throw createValidationError('Invalid location guide input', parsed.error);
    }

    const locationIds = parsed.data.locationIds;
    for (const locationId of locationIds) {
      await this.assertLocationAvailable(locationId);
    }

    const title = parsed.data.title.trim();
    const description = parsed.data.description;
    const imageUrls = await this.uploadImages(parsed.data.images as FileUploadLike[]);

    return this.prisma.$transaction(
      locationIds.map((locationId) =>
        this.prisma.locationGuide.create({
          data: {
            title,
            description,
            imageUrls,
            locationId,
          },
          include: { location: true },
        }),
      ),
    );
  }

  async update(id: string, input: LocationGuideUpdateDto) {
    const parsed = locationGuideUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw createValidationError('Invalid location guide update input', parsed.error);
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
      description:
        parsed.data.description !== undefined ? parsed.data.description.trim() : undefined,
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

  async bulkApplyLocationGuideImageByAnchor(
    fields: LocationGuideBulkApplyAnchorInput,
    rawImage: FileUploadLike,
  ): Promise<{ applied: Array<{ locationId: string; guideId: string; lineIndex: number }>; skipped: Array<{ locationId: string; reason: string }> }> {
    const parsedFields = locationGuideBulkApplyAnchorSchema.safeParse(fields);
    if (!parsedFields.success) {
      throw createValidationError('Invalid bulk anchor image input', parsedFields.error);
    }

    const uploaded = await this.uploadImages([rawImage]);
    const imageUrl = uploaded[0];
    if (!imageUrl) {
      throw new DomainError('VALIDATION_FAILED', 'Bulk anchor image upload produced no URL');
    }

    const applied: Array<{ locationId: string; guideId: string; lineIndex: number }> = [];
    const skipped: Array<{ locationId: string; reason: string }> = [];
    const { anchorToken } = parsedFields.data;

    for (const locationId of parsedFields.data.locationIds) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        include: { guide: true },
      });

      if (!location) {
        skipped.push({ locationId, reason: 'LOCATION_NOT_FOUND' });
        continue;
      }

      const nameLines = normalizeGuideLocationNameLines(location.name as GuideLocationNameLike);
      if (nameLines.length === 0) {
        skipped.push({ locationId, reason: 'EMPTY_LOCATION_NAME' });
        continue;
      }

      const lineIndex = findAnchorLineIndexInLocationName(nameLines, anchorToken);
      if (lineIndex === null) {
        skipped.push({ locationId, reason: 'ANCHOR_TOKEN_NOT_MATCHED_LOCATION_NAME' });
        continue;
      }

      try {
        if (location.guide) {
          const nextUrls = this.buildPatchedImageUrls(location.guide.imageUrls, nameLines.length, lineIndex, imageUrl);
          if (this.countNonEmptyImageSlots(nextUrls) > MAX_IMAGE_COUNT) {
            skipped.push({ locationId, reason: 'IMAGE_SLOT_LIMIT_EXCEEDED' });
            continue;
          }

          await this.repository.update(location.guide.id, { imageUrls: nextUrls });
          applied.push({
            locationId,
            guideId: location.guide.id,
            lineIndex,
          });
          continue;
        }

        if (!parsedFields.data.createGuideIfMissing) {
          skipped.push({ locationId, reason: 'NO_GUIDE' });
          continue;
        }

        await this.assertLocationAvailable(locationId);

        const rawTitle =
          parsedFields.data.titleForNewGuide != null && parsedFields.data.titleForNewGuide.length > 0
            ? parsedFields.data.titleForNewGuide.trim()
            : '목적지 안내';
        const titleNew = rawTitle.length > 0 ? rawTitle : '목적지 안내';

        const descNew =
          parsedFields.data.descriptionForNewGuide != null && parsedFields.data.descriptionForNewGuide.length > 0
            ? parsedFields.data.descriptionForNewGuide
            : '';

        const initialUrls = nameLines.map(() => '');
        initialUrls[lineIndex] = imageUrl;
        const created = await this.repository.create({
          title: titleNew,
          description: descNew,
          imageUrls: initialUrls,
          locationId,
        });

        applied.push({
          locationId,
          guideId: created.id,
          lineIndex,
        });
      } catch (_err) {
        skipped.push({
          locationId,
          reason: 'APPLY_FAILED',
        });
      }
    }

    return { applied, skipped };
  }

  private buildPatchedImageUrls(
    stored: unknown,
    normalizedLineCount: number,
    targetLineIndex: number,
    newUrl: string,
  ): string[] {
    const base = this.parseStoredImageUrls(stored);
    const minLen = Math.max(base.length, normalizedLineCount, targetLineIndex + 1);
    const out = [...base];
    while (out.length < minLen) {
      out.push('');
    }
    if (targetLineIndex >= 0 && targetLineIndex < out.length) {
      out[targetLineIndex] = newUrl;
    }
    return out;
  }

  private parseStoredImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const out: string[] = [];
    for (const item of value) {
      out.push(typeof item === 'string' ? item : '');
    }
    return out;
  }

  private countNonEmptyImageSlots(urls: string[]): number {
    return urls.filter((u) => typeof u === 'string' && u.trim().length > 0).length;
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
