export const PASSPORT_PHOTO_HEADER = '여권 전면사진';

const GOOGLE_DRIVE_URL_PATTERN = /https?:\/\/(?:drive|docs)\.google\.com[^\s,)"']+/gi;

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function pickPassportPhotoCellValue(rawJson: Record<string, string>): string | null {
  if (PASSPORT_PHOTO_HEADER in rawJson) {
    const value = rawJson[PASSPORT_PHOTO_HEADER]?.trim();
    return value || null;
  }

  const normalizedTarget = normalizeHeader(PASSPORT_PHOTO_HEADER);
  for (const [header, value] of Object.entries(rawJson)) {
    if (normalizeHeader(header) === normalizedTarget) {
      const trimmed = value?.trim();
      return trimmed || null;
    }
  }

  return null;
}

function splitDriveUrlCandidates(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function extractDriveUrlsFromText(text: string): string[] {
  const urls: string[] = [];
  for (const part of splitDriveUrlCandidates(text)) {
    const matches = part.match(GOOGLE_DRIVE_URL_PATTERN);
    if (matches?.length) {
      urls.push(...matches);
      continue;
    }
    if (/^https?:\/\//i.test(part)) {
      urls.push(part);
    }
  }
  return [...new Set(urls)];
}

export function extractPassportPhotoSourceUrls(rawJson: Record<string, string>): string[] {
  const cell = pickPassportPhotoCellValue(rawJson);
  if (!cell) {
    return [];
  }
  return extractDriveUrlsFromText(cell);
}

export function parseGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch?.[1]) {
    return openMatch[1];
  }

  const pathMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  return null;
}

export function parseGoogleDriveFileIds(urls: string[]): string[] {
  const ids = urls
    .map(parseGoogleDriveFileId)
    .filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

export function parsePassportPhotoUrlsJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function passportPhotoUrlsFromRawJson(rawJson: unknown): string[] {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return [];
  }
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawJson)) {
    if (typeof value === 'string') {
      record[key] = value;
    }
  }
  return extractPassportPhotoSourceUrls(record);
}
