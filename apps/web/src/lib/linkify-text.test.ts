import { describe, expect, it } from 'vitest';
import { splitTextIntoLinkifySegments } from './linkify-text';

describe('splitTextIntoLinkifySegments', () => {
  it('returns a single text segment when no URL is present', () => {
    expect(splitTextIntoLinkifySegments('일반 텍스트입니다.')).toEqual([
      { type: 'text', value: '일반 텍스트입니다.' },
    ]);
  });

  it('splits multiple Google Maps short URLs across lines', () => {
    const text = [
      '📍 7/1 Cozy 65(에어비앤비)',
      'https://maps.app.goo.gl/jpYmvTBa368qJBVJ7',
      '📍 7/2 UB Friends(게스트하우스)',
      'https://maps.app.goo.gl/NuRM8pqp3PayHvZG9',
      'https://maps.app.goo.gl/nJ2gY5pZWxvHUGMZ7',
    ].join('\n');

    expect(splitTextIntoLinkifySegments(text)).toEqual([
      { type: 'text', value: '📍 7/1 Cozy 65(에어비앤비)\n' },
      { type: 'link', value: 'https://maps.app.goo.gl/jpYmvTBa368qJBVJ7' },
      { type: 'text', value: '\n📍 7/2 UB Friends(게스트하우스)\n' },
      { type: 'link', value: 'https://maps.app.goo.gl/NuRM8pqp3PayHvZG9' },
      { type: 'text', value: '\n' },
      { type: 'link', value: 'https://maps.app.goo.gl/nJ2gY5pZWxvHUGMZ7' },
    ]);
  });

  it('strips trailing punctuation from URLs', () => {
    expect(splitTextIntoLinkifySegments('참고(https://example.com).')).toEqual([
      { type: 'text', value: '참고(' },
      { type: 'link', value: 'https://example.com' },
      { type: 'text', value: ').' },
    ]);
  });

  it('does not linkify javascript URLs', () => {
    expect(splitTextIntoLinkifySegments('javascript:alert(1)')).toEqual([
      { type: 'text', value: 'javascript:alert(1)' },
    ]);
  });

  it('preserves newlines in text segments', () => {
    expect(splitTextIntoLinkifySegments('첫 줄\n둘째 줄')).toEqual([
      { type: 'text', value: '첫 줄\n둘째 줄' },
    ]);
  });
});
