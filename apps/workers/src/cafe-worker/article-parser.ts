import { normalizeWhitespace, stripHtml } from '../lib/html';

const TITLE_PATTERNS = [
  /<[^>]*class="[^"]*title_text[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
  /<[^>]*class="[^"]*article_subject[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
  /<h3[^>]*>([\s\S]*?)<\/h3>/i,
  /<h2[^>]*>([\s\S]*?)<\/h2>/i,
];

const BODY_PATTERNS = [
  /<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*ContentRenderer[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*article_viewer[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*article_container[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
];

function matchFirst(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const matched = html.match(pattern)?.[1];
    if (matched) {
      return matched;
    }
  }

  return null;
}

export function extractArticleTitleFromHtml(html: string): string | null {
  const matched = matchFirst(html, TITLE_PATTERNS);
  return matched ? normalizeWhitespace(stripHtml(matched)) : null;
}

export function extractArticleBodyHtml(html: string): string | null {
  const matched = matchFirst(html, BODY_PATTERNS);
  return matched ? matched.trim() : null;
}

export function extractArticleBodyText(html: string): string {
  const bodyHtml = extractArticleBodyHtml(html) ?? html;
  return stripHtml(bodyHtml);
}
