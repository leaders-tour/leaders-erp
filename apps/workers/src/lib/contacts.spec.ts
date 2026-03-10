import { describe, expect, it } from 'vitest';
import { extractContacts } from './contacts';

describe('extractContacts', () => {
  it('extracts email and phone with regex fallback', () => {
    const contacts = extractContacts('문의는 test.user@example.com 또는 010-1234-5678로 부탁드립니다.');
    expect(contacts.email).toBe('test.user@example.com');
    expect(contacts.phone).toBe('010-1234-5678');
  });

  it('extracts kakao id', () => {
    const contacts = extractContacts('카카오톡 아이디: mongol_trip');
    expect(contacts.kakaoId).toBe('mongol_trip');
  });
});
