import { describe, expect, it } from 'vitest';
import { extractArticleBodyHtml, extractArticleBodyText, extractArticleTitleFromHtml } from './article-parser';

const html = `
  <div class="ArticleTitle"><h3 class="title_text">7월 가족 여행 견적 문의</h3></div>
  <div class="se-main-container">
    <p>성인 4명, 아이 1명입니다.</p>
    <p>고비사막과 테를지 일정 희망합니다.</p>
  </div>
`;

describe('article parser', () => {
  it('extracts title from known selectors', () => {
    expect(extractArticleTitleFromHtml(html)).toBe('7월 가족 여행 견적 문의');
  });

  it('extracts body html', () => {
    expect(extractArticleBodyHtml(html)).toContain('성인 4명');
  });

  it('extracts body text', () => {
    expect(extractArticleBodyText(html)).toContain('고비사막과 테를지 일정 희망합니다.');
  });
});
