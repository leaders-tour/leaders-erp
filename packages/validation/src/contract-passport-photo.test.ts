import { describe, expect, it } from 'vitest';
import {
  extractPassportPhotoSourceUrls,
  parseGoogleDriveFileId,
  parseGoogleDriveFileIds,
  parsePassportPhotoUrlsJson,
} from './contract-passport-photo';

describe('extractPassportPhotoSourceUrls', () => {
  it('reads the passport photo header and splits drive urls', () => {
    const urls = extractPassportPhotoSourceUrls({
      '여권 전면사진': 'https://drive.google.com/open?id=abc123',
      '여권번호': 'M12345678',
    });

    expect(urls).toEqual(['https://drive.google.com/open?id=abc123']);
  });

  it('deduplicates multiple urls in one cell', () => {
    const urls = extractPassportPhotoSourceUrls({
      '여권 전면사진': [
        'https://drive.google.com/open?id=abc123',
        'https://drive.google.com/file/d/abc123/view',
      ].join('\n'),
    });

    expect(urls).toHaveLength(2);
  });
});

describe('parseGoogleDriveFileId', () => {
  it('parses open and file path urls', () => {
    expect(parseGoogleDriveFileId('https://drive.google.com/open?id=abc123')).toBe('abc123');
    expect(parseGoogleDriveFileId('https://drive.google.com/file/d/xyz789/view?usp=drivesdk')).toBe('xyz789');
  });
});

describe('parseGoogleDriveFileIds', () => {
  it('returns unique ids', () => {
    expect(parseGoogleDriveFileIds([
      'https://drive.google.com/open?id=abc123',
      'https://drive.google.com/file/d/abc123/view',
    ])).toEqual(['abc123']);
  });
});

describe('parsePassportPhotoUrlsJson', () => {
  it('keeps only non-empty strings', () => {
    expect(parsePassportPhotoUrlsJson(['https://example.com/a.jpg', '', 1, null])).toEqual([
      'https://example.com/a.jpg',
    ]);
  });
});
