import { describe, expect, it } from 'vitest';
import { buildImageObjectKey } from './client';

const SAME_INSTANT = new Date('2026-10-23T03:00:00.000Z');

describe('buildImageObjectKey', () => {
  it('keeps the original basename and date folder while inserting a unique suffix', () => {
    const key = buildImageObjectKey({
      date: SAME_INSTANT,
      filename: 'image.png',
      uniqueId: '11111111-1111-4111-8111-111111111111',
    });

    expect(key).toBe('261023/image-11111111-1111-4111-8111-111111111111.png');
  });

  it('produces different keys for the same filename, date, and prefix', () => {
    const shared = {
      keyPrefix: 'korea-erp/dev',
      date: SAME_INSTANT,
      filename: '상세.jpg',
    };

    const first = buildImageObjectKey({
      ...shared,
      uniqueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    const second = buildImageObjectKey({
      ...shared,
      uniqueId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    expect(first).toBe(
      'korea-erp/dev/261023/__-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',
    );
    expect(second).toBe(
      'korea-erp/dev/261023/__-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',
    );
    expect(first).not.toBe(second);
  });
});
