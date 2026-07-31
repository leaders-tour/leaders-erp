import type { PrismaClient } from '@prisma/client';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  guideCreateSchema,
  guideLeaderstepsAuthLinkSchema,
  guideLeaderstepsAuthUnlinkSchema,
  guideLiveLocationFilterSchema,
  leaderstepsActiveProjectsFilterSchema,
  guideUpdateSchema,
} from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { getSupabaseAdminClient } from '../../lib/supabase';
import {
  getTodayInUlaanbaatar,
  getUlaanbaatarDayRange,
  isLogWithinProject,
  isProjectActiveOnDate,
  type LeaderstepsLocationLogRow,
  type LeaderstepsProjectRow,
} from './leadersteps-location.utils';
import { GuideRepository } from './guide.repository';
import type { GuideCreateDto, GuidesFilterDto, GuideUpdateDto } from './guide.types';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_CERT_IMAGE_COUNT = 20;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPABASE_AUTH_USERS_PAGE_SIZE = 1000;
const LOCATION_LOGS_PAGE_SIZE = 1000;

interface GuideLocationPointResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
  projectId: string;
}

interface GuideLiveLocationResult {
  guideId: string;
  guideNameKo: string;
  guideNameMn: string | null;
  profileImageUrl: string | null;
  latestLatitude: number;
  latestLongitude: number;
  latestAccuracy: number;
  latestRecordedAt: string;
  path: GuideLocationPointResult[];
  projectIds: string[];
}

interface LeaderstepsActiveProjectResult {
  id: string;
  name: string;
  startedAt: string;
  scheduledEndedAt: string;
  endedAt: string | null;
  isActive: boolean;
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

  async listLeaderstepsActiveProjects(date?: string | null) {
    const parsed = leaderstepsActiveProjectsFilterSchema.safeParse({ date });
    if (!parsed.success) {
      throw createValidationError('Invalid active projects filter', parsed.error);
    }

    const targetDate = parsed.data.date ?? getTodayInUlaanbaatar();
    const { startMs, endMs } = getUlaanbaatarDayRange(targetDate);
    const { data, error } = await getSupabaseAdminClient()
      .from('projects')
      .select('id,name,started_at,scheduled_ended_at,ended_at,is_active')
      .order('started_at', { ascending: false });

    if (error) {
      throw new DomainError('EXTERNAL_SERVICE_ERROR', 'Leadersteps 프로젝트 목록을 불러오지 못했습니다.');
    }

    return (data as LeaderstepsProjectRow[])
      .filter((project) => isProjectActiveOnDate(project, startMs, endMs))
      .map(
        (project): LeaderstepsActiveProjectResult => ({
          id: project.id,
          name: project.name,
          startedAt: new Date(Number(project.started_at)).toISOString(),
          scheduledEndedAt: new Date(Number(project.scheduled_ended_at)).toISOString(),
          endedAt:
            project.ended_at != null ? new Date(Number(project.ended_at)).toISOString() : null,
          isActive: Boolean(project.is_active),
        }),
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'ko'));
  }

  async listGuideLiveLocations(projectId?: string | null, date?: string | null) {
    const parsed = guideLiveLocationFilterSchema.safeParse({ projectId, date });
    if (!parsed.success) {
      throw createValidationError('Invalid guide live location filter', parsed.error);
    }

    const activeProjects = await this.listLeaderstepsActiveProjects(parsed.data.date);
    const filteredProjects =
      parsed.data.projectId != null
        ? activeProjects.filter((project) => project.id === parsed.data.projectId)
        : activeProjects;

    if (filteredProjects.length === 0) {
      return [];
    }

    const projectById = new Map(
      filteredProjects.map((project) => [
        project.id,
        {
          id: project.id,
          name: project.name,
          started_at: new Date(project.startedAt).getTime(),
          scheduled_ended_at: new Date(project.scheduledEndedAt).getTime(),
          ended_at: project.endedAt ? new Date(project.endedAt).getTime() : null,
          is_active: project.isActive,
        } satisfies LeaderstepsProjectRow,
      ]),
    );
    const projectIds = [...projectById.keys()];
    const logs = await this.fetchLeaderstepsLocationLogs(projectIds);
    const logsByUserId = new Map<string, GuideLocationPointResult[]>();

    for (const log of logs) {
      const project = projectById.get(log.project_id);
      if (!project) {
        continue;
      }

      const timestamp = Number(log.timestamp);
      if (!isLogWithinProject(timestamp, project)) {
        continue;
      }

      const latitude = Number(log.lat);
      const longitude = Number(log.lng);
      const accuracy = Number(log.accuracy);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) {
        continue;
      }

      const point: GuideLocationPointResult = {
        latitude,
        longitude,
        accuracy,
        recordedAt: new Date(timestamp).toISOString(),
        projectId: log.project_id,
      };
      const existing = logsByUserId.get(log.user_id) ?? [];
      existing.push(point);
      logsByUserId.set(log.user_id, existing);
    }

    if (logsByUserId.size === 0) {
      return [];
    }

    const linkedGuides = await new GuideRepository(this.prisma).findLinkedLeaderstepsAuthUsers();
    const guideByAuthUserId = new Map(
      linkedGuides.flatMap((guide) =>
        guide.leaderstepsAuthUserId ? [[guide.leaderstepsAuthUserId, guide] as const] : [],
      ),
    );
    const unmatchedAuthUserIds = [...logsByUserId.keys()].filter(
      (authUserId) => !guideByAuthUserId.has(authUserId),
    );
    const authDisplayNameByUserId = await this.resolveAuthUserDisplayNames(unmatchedAuthUserIds);
    const results: GuideLiveLocationResult[] = [];

    for (const [authUserId, rawPath] of logsByUserId) {
      const path = rawPath.sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
      const latest = path[path.length - 1];
      if (!latest) {
        continue;
      }

      const guide = guideByAuthUserId.get(authUserId);
      results.push({
        guideId: guide?.id ?? authUserId,
        guideNameKo:
          guide?.nameKo ?? authDisplayNameByUserId.get(authUserId) ?? 'Leadersteps 사용자',
        guideNameMn: guide?.nameMn ?? null,
        profileImageUrl: guide?.profileImageUrl ?? null,
        latestLatitude: latest.latitude,
        latestLongitude: latest.longitude,
        latestAccuracy: latest.accuracy,
        latestRecordedAt: latest.recordedAt,
        path,
        projectIds: [...new Set(path.map((point) => point.projectId))],
      });
    }

    return results.sort((left, right) => left.guideNameKo.localeCompare(right.guideNameKo, 'ko'));
  }

  private async resolveAuthUserDisplayNames(userIds: string[]) {
    const displayNameByUserId = new Map<string, string>();
    if (userIds.length === 0) {
      return displayNameByUserId;
    }

    await Promise.all(
      userIds.map(async (userId) => {
        const { data, error } = await getSupabaseAdminClient().auth.admin.getUserById(userId);
        if (error || !data.user) {
          displayNameByUserId.set(userId, userId.slice(0, 8));
          return;
        }

        displayNameByUserId.set(
          userId,
          readMetadataText(data.user.user_metadata, ['display_name', 'full_name', 'name']) ??
            data.user.email ??
            userId.slice(0, 8),
        );
      }),
    );

    return displayNameByUserId;
  }

  private async fetchLeaderstepsLocationLogs(projectIds: string[]) {
    const supabase = getSupabaseAdminClient();
    const allLogs: LeaderstepsLocationLogRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from('location_logs')
        .select('user_id,project_id,lat,lng,accuracy,timestamp')
        .in('project_id', projectIds)
        .order('timestamp', { ascending: true })
        .range(offset, offset + LOCATION_LOGS_PAGE_SIZE - 1);

      if (error) {
        throw new DomainError('EXTERNAL_SERVICE_ERROR', '가이드 위치 기록을 불러오지 못했습니다.');
      }

      const page = (data ?? []) as LeaderstepsLocationLogRow[];
      allLogs.push(...page);
      if (page.length < LOCATION_LOGS_PAGE_SIZE) {
        break;
      }
      offset += LOCATION_LOGS_PAGE_SIZE;
    }

    return allLogs;
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
