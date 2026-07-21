import { describe, expect, it } from 'vitest';
import { saveConfirmationDocumentMemoSchema } from './confirmation-document.schema';

describe('saveConfirmationDocumentMemoSchema', () => {
  it('trims content and accepts up to 2000 characters', () => {
    const result = saveConfirmationDocumentMemoSchema.safeParse({
      confirmationDocumentId: 'doc-1',
      content: '  내부 메모  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('내부 메모');
    }
  });

  it('rejects content longer than 2000 characters', () => {
    const result = saveConfirmationDocumentMemoSchema.safeParse({
      confirmationDocumentId: 'doc-1',
      content: 'a'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it('allows empty content after trim for memo deletion', () => {
    const result = saveConfirmationDocumentMemoSchema.safeParse({
      confirmationDocumentId: 'doc-1',
      content: '   ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('');
    }
  });
});
