export function extractArticleId(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null;
  }

  const candidates = [candidate];
  try {
    candidates.push(decodeURIComponent(candidate));
  } catch {
    // ignore invalid URI component
  }

  for (const value of candidates) {
    const directMatch = value.match(/articleid(?:=|%3[dD])(\d+)/i);
    if (directMatch?.[1]) {
      return directMatch[1];
    }

    const pathMatch = value.match(/\/articles\/(\d+)/i);
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }

    const legacyMatch = value.match(/articleId["']?\s*[:=]\s*["']?(\d+)/i);
    if (legacyMatch?.[1]) {
      return legacyMatch[1];
    }
  }

  return null;
}

export function extractArticleIdFromCandidates(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const articleId = extractArticleId(candidate);
    if (articleId) {
      return articleId;
    }
  }

  return null;
}
