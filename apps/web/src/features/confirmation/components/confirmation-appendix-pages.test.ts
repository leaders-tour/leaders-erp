import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIRMATION_APPENDIX_INCLUDE_IMAGE_PAGES } from '../model/constants';

describe('ConfirmationAppendixPages defaults', () => {
  it('keeps image appendix pages enabled by default for existing 4-page flows', () => {
    expect(DEFAULT_CONFIRMATION_APPENDIX_INCLUDE_IMAGE_PAGES).toBe(true);
  });
});
