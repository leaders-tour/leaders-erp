import type { PrismaClient } from '@prisma/client';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  guideCreateSchema,
  guideLeaderstepsAuthLinkSchema,
  guideLeaderstepsAuthUnlinkSchema,
  guideLocationFilterSchema,
  guideUpdateSchema,
} from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { GuideRepository } from './guide.repository';
import type { GuideCreateDto, GuidesFilterDto, GuideUpdateDto } from './guide.types';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_CERT_IMAGE_COUNT = 20;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPABASE_AUTH_USERS_PAGE_SIZE = 1000;
const ULAANBAATAR_DAY_MS = 24 * 60 * 60 * 1000;

interface GuideLocationResult {
  guideId: string;
  guideNameKo: string;
  guideNameMn: string | null;
  profileImageUrl: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
  source: string;
  projectId: string;
}

function readMetadataText(metadata: unknown, keys: readonly string[]): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

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

  async listLeaderstepsAuthUsers() {
    const authUsers: SupabaseAuthUser[] = [];
    let page = 1;

    while (true) {
      const { data, error } = await getSupabaseAdminClient().auth.admin.listUsers({
        page,
        perPage: SUPABASE_AUTH_USERS_PAGE_SIZE,
      });
      if (error) {
        throw new DomainError('EXTERNAL_SERVICE_ERROR', 'Leadersteps 계정 목록을 불러오지 못했습니다.');
      }
      authUsers.push(...data.users);
      if (data.users.length < SUPABASE_AUTH_USERS_PAGE_SIZE) {
        break;
      }
      page += 1;
    }

    const linkedGuides = await new GuideRepository(this.prisma).findLinkedLeaderstepsAuthUsers();
    const linkedGuideByAuthUserId = new Map(
      linkedGuides.flatMap((guide) =>
        guide.leaderstepsAuthUserId ? [[guide.leaderstepsAuthUserId, guide] as const] : [],
      ),
    );

    return authUsers
      .map((authUser) => {
        const linkedGuide = linkedGuideByAuthUserId.get(authUser.id);
        return {
          id: authUser.id,
          email: authUser.email ?? null,
          phone: authUser.phone || null,
          displayName: readMetadataText(authUser.user_metadata, [
            'display_name',
            'full_name',
            'name',
          ]),
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at ?? null,
          linkedGuideId: linkedGuide?.id ?? null,
          linkedGuideNameKo: linkedGuide?.nameKo ?? null,
          linkedGuideNameMn: linkedGuide?.nameMn ?? null,
        };
      })
      .sort((left, right) =>
        (left.email ?? left.displayName ?? left.id).localeCompare(
          right.email ?? right.displayName ?? right.id,
        ),
      );
  }

  async listGuideLocations(date: string, guideId?: string | null) {
    const parsed = guideLocationFilterSchema.safeParse({ date, guideId });
    if (!parsed.success) {
      throw createValidationError('Invalid guide location filter', parsed.error);
    }

    const startMs = Date.parse(`${parsed.data.date}T00:00:00+08:00`);
    const endMs = startMs + ULAANBAATAR_DAY_MS;
    const guides = await new GuideRepository(this.prisma).findLinkedLeaderstepsGuides(
      parsed.data.guideId,
    );
    const supabase = getSupabaseAdminClient();

    const locations = await Promise.all(
      guides.map(async (guide): Promise<GuideLocationResult | null> => {
        if (!guide.leaderstepsAuthUserId) {
          return null;
        }

        const { data, error } = await supabase
          .from('location_logs')
          .select('lat,lng,accuracy,timestamp,source,project_id')
          .eq('user_id', guide.leaderstepsAuthUserId)
          .gte('timestamp', startMs)
          .lt('timestamp', endMs)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new DomainError(
            'EXTERNAL_SERVICE_ERROR',
            `${guide.nameKo} 가이드의 위치를 불러오지 못했습니다.`,
          );
        }
        if (!data) {
          return null;
        }

        const latitude = Number(data.lat);
        const longitude = Number(data.lng);
        const accuracy = Number(data.accuracy);
        const timestamp = Number(data.timestamp);
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          !Number.isFinite(accuracy) ||
          !Number.isFinite(timestamp)
        ) {
          return null;
        }

        return {
          guideId: guide.id,
          guideNameKo: guide.nameKo,
          guideNameMn: guide.nameMn,
          profileImageUrl: guide.profileImageUrl,
          latitude,
          longitude,
          accuracy,
          recordedAt: new Date(timestamp).toISOString(),
          source: String(data.source),
          projectId: String(data.project_id),
        };
      }),
    );

    return locations.filter((location): location is GuideLocationResult => location !== null);
  }

  async linkLeaderstepsAuth(guideId: string, authUserId: string) {
    const parsed = guideLeaderstepsAuthLinkSchema.safeParse({ guideId, authUserId });
    if (!parsed.success) {
      throw createValidationError('Invalid guide account link input', parsed.error);
    }

    const repository = new GuideRepository(this.prisma);
    const guide = await repository.findById(parsed.data.guideId);
    if (!guide) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    if (guide.leaderstepsAuthUserId === parsed.data.authUserId) {
      return guide;
    }
    if (guide.leaderstepsAuthUserId) {
      throw new DomainError('VALIDATION_FAILED', '기존 Leadersteps 계정 연결을 먼저 해제해 주세요.');
    }

    const linkedGuide = await repository.findByLeaderstepsAuthUserId(parsed.data.authUserId);
    if (linkedGuide) {
      throw new DomainError(
        'VALIDATION_FAILED',
        `이미 ${linkedGuide.nameKo} 가이드에게 연결된 Leadersteps 계정입니다.`,
      );
    }

    const { data, error } = await getSupabaseAdminClient().auth.admin.getUserById(
      parsed.data.authUserId,
    );
    if (error || !data.user) {
      throw new DomainError('NOT_FOUND', 'Leadersteps 계정을 찾을 수 없습니다.');
    }

    return repository.linkLeaderstepsAuth(parsed.data.guideId, parsed.data.authUserId);
  }

  async unlinkLeaderstepsAuth(guideId: string) {
    const parsed = guideLeaderstepsAuthUnlinkSchema.safeParse({ guideId });
    if (!parsed.success) {
      throw createValidationError('Invalid guide account unlink input', parsed.error);
    }

    const repository = new GuideRepository(this.prisma);
    const guide = await repository.findById(parsed.data.guideId);
    if (!guide) {
      throw new DomainError('NOT_FOUND', 'Guide not found');
    }
    if (!guide.leaderstepsAuthUserId) {
      return guide;
    }
    return repository.unlinkLeaderstepsAuth(parsed.data.guideId);
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
