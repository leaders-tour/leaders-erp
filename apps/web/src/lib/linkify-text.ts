export type LinkifyTextSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string };

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)}\]'"]+$/;

function trimTrailingPunctuation(url: string): string {
  return url.replace(TRAILING_PUNCTUATION_PATTERN, '');
}

export function splitTextIntoLinkifySegments(text: string): LinkifyTextSegment[] {
  if (!text) {
    return [];
  }

  const segments: LinkifyTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
    }

    const trimmedUrl = trimTrailingPunctuation(rawUrl);
    const trailingText = rawUrl.slice(trimmedUrl.length);

    if (trimmedUrl) {
      segments.push({ type: 'link', value: trimmedUrl });
    }
    if (trailingText) {
      segments.push({ type: 'text', value: trailingText });
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}
