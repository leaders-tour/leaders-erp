import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { Prisma, PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import {
  extractPassportPhotoSourceUrls,
  parseGoogleDriveFileIds,
  parsePassportPhotoUrlsJson,
  rawJsonAsStringRecord,
} from '@tour/validation';
import { FileStorageClient, type UploadFile } from '../../lib/file-storage/client';
import { getGoogleAccessToken } from '../../lib/google/access-token';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;
const SKIP_RESIZE_BELOW_BYTES = 300_000;

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
    },
  });

  let updated = 0;
  for (const row of rows) {
    if (options?.limit != null && updated >= options.limit) {
      break;
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
    };
    const changed = await syncPassportPhotosForSubmission(prisma, row.id, rawJson, existing, accessToken);
    if (changed) {
      updated += 1;
    }
  }

  return { scanned: rows.length, updated };
}
