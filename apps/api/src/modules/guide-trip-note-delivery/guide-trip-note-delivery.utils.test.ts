import { describe, expect, it } from 'vitest';
import { resolveLinkedGuideRecipients } from './guide-trip-note-delivery.utils';

describe('guide-trip-note-delivery.utils', () => {
  it('deduplicates linked guide recipients by auth user id', () => {
    const recipients = resolveLinkedGuideRecipients([
      { guide: { id: 'guide-1', leaderstepsAuthUserId: 'auth-1' } },
      { guide: { id: 'guide-2', leaderstepsAuthUserId: 'auth-1' } },
      { guide: { id: 'guide-3', leaderstepsAuthUserId: 'auth-2' } },
      { guide: { id: 'guide-4', leaderstepsAuthUserId: null } },
    ]);

    expect(recipients).toEqual([
      { guideId: 'guide-1', authUserId: 'auth-1' },
      { guideId: 'guide-3', authUserId: 'auth-2' },
    ]);
  });
});
