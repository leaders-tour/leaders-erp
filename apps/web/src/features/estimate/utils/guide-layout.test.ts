import { describe, expect, it } from 'vitest';
import { chunkEstimateGuidePages, chunkGuidePagesBySplits } from './guide-layout';

describe('chunkEstimateGuidePages', () => {
  it('splits evenly by perPage', () => {
    expect(chunkEstimateGuidePages([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
});

describe('chunkGuidePagesBySplits (lump — 저장 견적·PDF 기본)', () => {
  it('lumps remainder on one page when splits are shorter than block count', () => {
    const blocks = [1, 2, 3, 4, 5, 6, 7];
    expect(chunkGuidePagesBySplits(blocks, [3])).toEqual([[1, 2, 3], [4, 5, 6, 7]]);
  });

  it('honors oversized explicit split without perPage cap', () => {
    const blocks = [1, 2, 3, 4, 5, 6, 7];
    expect(chunkGuidePagesBySplits(blocks, [4])).toEqual([[1, 2, 3, 4], [5, 6, 7]]);
  });
});

describe('chunkGuidePagesBySplits (chunk-per-page — 빌더 미리보기)', () => {
  it('continues remainder with perPage instead of lumping on one page', () => {
    const blocks = [1, 2, 3, 4, 5, 6, 7];
    expect(
      chunkGuidePagesBySplits(blocks, [3], { perPage: 3, remainderStrategy: 'chunk-per-page' }),
    ).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('caps an oversized explicit split to perPage', () => {
    const blocks = [1, 2, 3, 4, 5, 6, 7];
    expect(
      chunkGuidePagesBySplits(blocks, [4], { perPage: 3, remainderStrategy: 'chunk-per-page' }),
    ).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('honors multi-value splits then chunks remainder', () => {
    const blocks = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(
      chunkGuidePagesBySplits(blocks, [2, 2], { perPage: 3, remainderStrategy: 'chunk-per-page' }),
    ).toEqual([[1, 2], [3, 4], [5, 6, 7], [8]]);
  });
});
