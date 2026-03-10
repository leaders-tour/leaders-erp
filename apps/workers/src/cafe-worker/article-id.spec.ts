import { describe, expect, it } from 'vitest';
import { extractArticleId, extractArticleIdFromCandidates } from './article-id';

describe('extractArticleId', () => {
  it('extracts from direct query parameter', () => {
    expect(extractArticleId('https://cafe.naver.com/ArticleRead.nhn?clubid=1&articleid=12345')).toBe('12345');
  });

  it('extracts from encoded parameter', () => {
    expect(extractArticleId('https://example.com?redirect=articleid%3D9988')).toBe('9988');
  });

  it('extracts from article path', () => {
    expect(extractArticleId('https://cafe.naver.com/ca-fe/cafes/1/articles/777')).toBe('777');
  });

  it('tries multiple candidates', () => {
    expect(extractArticleIdFromCandidates([null, 'javascript:openArticle({articleId:54321})'])).toBe('54321');
  });
});
