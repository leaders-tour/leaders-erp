export const CUSTOMER_PAGE_SIZE = 20;

export type PaginationItem = number | 'ellipsis';

export function parseCustomerPageParam(raw: string | null): number {
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export function clampCustomerPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

export function resolveSafeCustomerPage(
  currentPage: number,
  totalPages: number,
  hasKnownTotal: boolean,
): number {
  if (!hasKnownTotal) {
    return currentPage;
  }
  return clampCustomerPage(currentPage, totalPages);
}

export function getCustomerTotalPages(totalItems: number, pageSize = CUSTOMER_PAGE_SIZE): number {
  if (totalItems <= 0) return 0;
  return Math.ceil(totalItems / pageSize);
}

export function paginateCustomerItems<T>(items: readonly T[], page: number, pageSize = CUSTOMER_PAGE_SIZE): T[] {
  if (items.length === 0) return [];
  const totalPages = getCustomerTotalPages(items.length, pageSize);
  const safePage = clampCustomerPage(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function buildCustomerPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let offset = 1; offset <= siblingCount; offset += 1) {
    pages.add(currentPage - offset);
    pages.add(currentPage + offset);
  }

  const sortedPages = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage != null && page - previousPage > 1) {
      items.push('ellipsis');
    }
    items.push(page);
  });

  return items;
}

export const CUSTOMER_PAGINATION_SHORTCUT_HELP =
  '페이지 이동 단축키: Q / ㅂ → 이전, E / ㄷ → 다음';

export type CustomerPaginationShortcutAction = 'prev' | 'next';

const PREVIOUS_PAGE_KEYS = new Set(['q', 'ㅂ', 'ㅃ']);
const NEXT_PAGE_KEYS = new Set(['e', 'ㄷ', 'ㄸ']);

export function getCustomerPaginationShortcutAction(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'>,
): CustomerPaginationShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return null;

  if (event.code === 'KeyQ' || PREVIOUS_PAGE_KEYS.has(event.key.toLowerCase())) {
    return 'prev';
  }
  if (event.code === 'KeyE' || NEXT_PAGE_KEYS.has(event.key.toLowerCase())) {
    return 'next';
  }
  return null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}
