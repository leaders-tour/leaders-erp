import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { Prisma, PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import {
  extractPassportPhotoSourceUrls,
  parseGoogleDriveFileIds,
  parsePassportPhotoUrlsJson,
  rawJsonAsStringRecord,
  removeContractSubmissionPassportPhotoInputSchema,
  resyncContractSubmissionPassportPhotoFromSheetInputSchema,
} from '@tour/validation';
import { DomainError, createValidationError } from '../../lib/errors';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { getGoogleAccessToken } from '../../lib/google/access-token';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;
const SKIP_RESIZE_BELOW_BYTES = 300_000;
const ALLOWED_MANUAL_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function digestPassportPhotoSources(urls: string[]): string | null {
  const normalized = [...new Set(urls.map((url) => url.trim()).filter(Boolean))].sort();
  if (normalized.length === 0) {
    return null;
  }
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export interface PassportPhotoExistingState {
  passportPhotoUrls: unknown;
  passportPhotoSourceDigest: string | null;
  passportPhotoSourceMode?: 'AUTO' | 'MANUAL' | null;
}

export interface PassportPhotoResolved {
  passportPhotoUrls: string[];
  passportPhotoSourceDigest: string | null;
}

async function downloadDriveFile(
  fileId: string,
  accessToken: string,
): Promise<{ ok: true; buffer: Buffer; mimeType: string } | { ok: false; reason: string }> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      reason: `Drive download failed (${response.status}): ${body.slice(0, 200)}`,
    };
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? 'application/octet-stream';
  if (!mimeType.startsWith('image/')) {
    return { ok: false, reason: `Unsupported mime type: ${mimeType}` };
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: `File exceeds ${MAX_FILE_SIZE_BYTES} bytes` };
  }

  return { ok: true, buffer: Buffer.from(arrayBuffer), mimeType };
}

interface PreparedPassportPhoto {
  buffer: Buffer;
  mimeType: string;
}

async function preparePassportPhotoBuffer(buffer: Buffer, mimeType: string): Promise<PreparedPassportPhoto> {
  if (buffer.byteLength < SKIP_RESIZE_BELOW_BYTES && mimeType === 'image/jpeg') {
    return { buffer, mimeType: 'image/jpeg' };
  }

  try {
    const resized = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { buffer: resized, mimeType: 'image/jpeg' };
  } catch {
    if (mimeType.startsWith('image/')) {
      return { buffer, mimeType };
    }
    throw new Error(`Unsupported image format: ${mimeType}`);
  }
}

function uploadFilenameForMime(submissionId: string, index: number, mimeType: string): string {
  if (mimeType === 'image/png') {
    return `passport-${submissionId}-${index + 1}.png`;
  }
  if (mimeType === 'image/webp') {
    return `passport-${submissionId}-${index + 1}.webp`;
  }
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return `passport-${submissionId}-${index + 1}.heic`;
  }
  return `passport-${submissionId}-${index + 1}.jpg`;
}

async function uploadPassportPhotoToS3(
  submissionId: string,
  index: number,
  photo: PreparedPassportPhoto,
): Promise<string> {
  const uploadFile: UploadFile = {
    filename: uploadFilenameForMime(submissionId, index, photo.mimeType),
    mimetype: photo.mimeType,
    createReadStream: () => Readable.from(photo.buffer),
  };
  return new FileStorageClient().uploadImage(uploadFile, MAX_FILE_SIZE_BYTES);
}

function unchangedPassportState(
  existing: PassportPhotoExistingState | null,
): PassportPhotoResolved {
  return {
    passportPhotoUrls: parsePassportPhotoUrlsJson(existing?.passportPhotoUrls),
    passportPhotoSourceDigest: existing?.passportPhotoSourceDigest ?? null,
  };
}

export async function resolvePassportPhotosForSubmission(
  submissionId: string,
  rawJson: Record<string, string>,
  existing: PassportPhotoExistingState | null,
  accessToken: string,
): Promise<PassportPhotoResolved> {
  if (existing?.passportPhotoSourceMode === 'MANUAL') {
    return unchangedPassportState(existing);
  }

  const sourceUrls = extractPassportPhotoSourceUrls(rawJson);
  const sourceDigest = digestPassportPhotoSources(sourceUrls);
  const existingUrls = parsePassportPhotoUrlsJson(existing?.passportPhotoUrls);

  if (sourceUrls.length === 0) {
    return { passportPhotoUrls: [], passportPhotoSourceDigest: null };
  }

  if (sourceDigest && existing?.passportPhotoSourceDigest === sourceDigest && existingUrls.length > 0) {
    return {
      passportPhotoUrls: existingUrls,
      passportPhotoSourceDigest: sourceDigest,
    };
  }

  const fileIds = parseGoogleDriveFileIds(sourceUrls);
  if (fileIds.length === 0) {
    console.warn(`[passport-photo] submission ${submissionId}: no parseable Drive file ids`);
    return unchangedPassportState(existing);
  }

  const uploadedUrls: string[] = [];
  for (let index = 0; index < fileIds.length; index += 1) {
    const fileId = fileIds[index];
    if (!fileId) {
      continue;
    }
    const downloaded = await downloadDriveFile(fileId, accessToken);
    if (!downloaded.ok) {
      console.warn(`[passport-photo] submission ${submissionId} file ${fileId}: ${downloaded.reason}`);
      return unchangedPassportState(existing);
    }

    try {
      const prepared = await preparePassportPhotoBuffer(downloaded.buffer, downloaded.mimeType);
      uploadedUrls.push(await uploadPassportPhotoToS3(submissionId, index, prepared));
    } catch (error) {
      console.warn(`[passport-photo] submission ${submissionId} file ${fileId} failed`, error);
      return unchangedPassportState(existing);
    }
  }

  return {
    passportPhotoUrls: uploadedUrls,
    passportPhotoSourceDigest: sourceDigest,
  };
}

export function passportPhotoFieldsChanged(
  current: PassportPhotoExistingState,
  resolved: PassportPhotoResolved,
): boolean {
  const currentUrls = parsePassportPhotoUrlsJson(current.passportPhotoUrls);
  return (
    current.passportPhotoSourceDigest !== resolved.passportPhotoSourceDigest
    || currentUrls.length !== resolved.passportPhotoUrls.length
    || currentUrls.some((url, index) => url !== resolved.passportPhotoUrls[index])
  );
}

export async function syncPassportPhotosForSubmission(
  prisma: PrismaLike,
  submissionId: string,
  rawJson: Record<string, string>,
  existing: PassportPhotoExistingState,
  accessToken: string,
): Promise<boolean> {
  const resolved = await resolvePassportPhotosForSubmission(submissionId, rawJson, existing, accessToken);
  if (!passportPhotoFieldsChanged(existing, resolved)) {
    return false;
  }

  await prisma.contractSubmission.update({
    where: { id: submissionId },
    data: {
      passportPhotoUrls: resolved.passportPhotoUrls,
      passportPhotoSourceDigest: resolved.passportPhotoSourceDigest,
    },
  });
  return true;
}

export async function backfillContractSubmissionPassportPhotos(
  prisma: PrismaLike,
  options?: { sourceId?: string; limit?: number },
): Promise<{ scanned: number; updated: number }> {
  const accessToken = await getGoogleAccessToken();
  const rows = await prisma.contractSubmission.findMany({
    where: options?.sourceId ? { sourceId: options.sourceId } : undefined,
    select: {
      id: true,
      rawJson: true,
      passportPhotoUrls: true,
      passportPhotoSourceDigest: true,
      passportPhotoSourceMode: true,
    },
  });

  let updated = 0;
  for (const row of rows) {
    if (options?.limit != null && updated >= options.limit) {
      break;
    }

    if (row.passportPhotoSourceMode === 'MANUAL') {
      continue;
    }

    const rawJson = rawJsonAsStringRecord(row.rawJson);
    const existingUrls = parsePassportPhotoUrlsJson(row.passportPhotoUrls);
    const sourceUrls = extractPassportPhotoSourceUrls(rawJson);
    if (existingUrls.length > 0 || sourceUrls.length === 0) {
      continue;
    }

    const existing: PassportPhotoExistingState = {
      passportPhotoUrls: row.passportPhotoUrls,
      passportPhotoSourceDigest: row.passportPhotoSourceDigest,
      passportPhotoSourceMode: row.passportPhotoSourceMode,
    };
    const changed = await syncPassportPhotosForSubmission(prisma, row.id, rawJson, existing, accessToken);
    if (changed) {
      updated += 1;
    }
  }

  return { scanned: rows.length, updated };
}

async function readUploadFileToBuffer(image: UploadFile): Promise<{ buffer: Buffer; mimeType: string }> {
  const chunks: Buffer[] = [];
  for await (const chunk of image.createReadStream()) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new DomainError('VALIDATION_FAILED', `File exceeds ${MAX_FILE_SIZE_BYTES} bytes`);
  }
  return { buffer, mimeType: image.mimetype };
}

function assertAllowedManualMimeType(mimeType: string): void {
  if (!ALLOWED_MANUAL_MIME_TYPES.has(mimeType)) {
    throw new DomainError('VALIDATION_FAILED', `Unsupported file type: ${mimeType}`);
  }
}

function manualPassportPhotoUpdateData(employeeId: string) {
  return {
    passportPhotoSourceMode: 'MANUAL' as const,
    passportPhotoManualByEmployeeId: employeeId,
    passportPhotoManualAt: new Date(),
  };
}

async function findContractSubmissionOrThrow(prisma: PrismaLike, submissionId: string) {
  const submission = await prisma.contractSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    throw new DomainError('NOT_FOUND', 'Contract submission not found');
  }
  return submission;
}

export async function uploadContractSubmissionPassportPhotoManual(
  prisma: PrismaClient,
  submissionId: string,
  rawImage: UploadFile | Promise<UploadFile>,
  employeeId: string,
) {
  await findContractSubmissionOrThrow(prisma, submissionId);
  const image = await Promise.resolve(rawImage);
  assertAllowedManualMimeType(image.mimetype);

  const { buffer, mimeType } = await readUploadFileToBuffer(image);
  const prepared = await preparePassportPhotoBuffer(buffer, mimeType);
  const url = await uploadPassportPhotoToS3(submissionId, 0, prepared);

  return prisma.contractSubmission.update({
    where: { id: submissionId },
    data: {
      passportPhotoUrls: [url],
      ...manualPassportPhotoUpdateData(employeeId),
    },
  });
}

export async function removeContractSubmissionPassportPhotoManual(
  prisma: PrismaClient,
  input: unknown,
  employeeId: string,
) {
  const parsed = removeContractSubmissionPassportPhotoInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createValidationError('Invalid remove passport photo input', parsed.error);
  }

  const submission = await findContractSubmissionOrThrow(prisma, parsed.data.submissionId);
  const currentUrls = parsePassportPhotoUrlsJson(submission.passportPhotoUrls);
  const nextUrls = parsed.data.imageUrl
    ? currentUrls.filter((url) => url !== parsed.data.imageUrl)
    : [];

  if (parsed.data.imageUrl && nextUrls.length === currentUrls.length) {
    throw new DomainError('NOT_FOUND', 'Passport photo not found');
  }

  return prisma.contractSubmission.update({
    where: { id: submission.id },
    data: {
      passportPhotoUrls: nextUrls,
      ...manualPassportPhotoUpdateData(employeeId),
    },
  });
}

export async function resyncContractSubmissionPassportPhotoFromSheetManual(
  prisma: PrismaClient,
  input: unknown,
) {
  const parsed = resyncContractSubmissionPassportPhotoFromSheetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw createValidationError('Invalid resync passport photo input', parsed.error);
  }

  const submission = await findContractSubmissionOrThrow(prisma, parsed.data.submissionId);
  const rawJson = rawJsonAsStringRecord(submission.rawJson);
  const accessToken = await getGoogleAccessToken();
  const resolved = await resolvePassportPhotosForSubmission(
    submission.id,
    rawJson,
    {
      passportPhotoUrls: submission.passportPhotoUrls,
      passportPhotoSourceDigest: submission.passportPhotoSourceDigest,
      passportPhotoSourceMode: 'AUTO',
    },
    accessToken,
  );

  return prisma.contractSubmission.update({
    where: { id: submission.id },
    data: {
      passportPhotoUrls: resolved.passportPhotoUrls,
      passportPhotoSourceDigest: resolved.passportPhotoSourceDigest,
      passportPhotoSourceMode: 'AUTO',
      passportPhotoManualByEmployeeId: null,
      passportPhotoManualAt: null,
    },
  });
}
