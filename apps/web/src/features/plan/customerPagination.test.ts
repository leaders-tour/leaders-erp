import { describe, expect, it } from 'vitest';
import {
  buildCustomerPaginationItems,
  clampCustomerPage,
  CUSTOMER_PAGE_SIZE,
  getCustomerPaginationShortcutAction,
  getCustomerTotalPages,
  paginateCustomerItems,
  parseCustomerPageParam,
  resolveSafeCustomerPage,
} from './customerPagination';

describe('customerPagination', () => {
  it('parses page query param with safe defaults', () => {
    expect(parseCustomerPageParam(null)).toBe(1);
    expect(parseCustomerPageParam('')).toBe(1);
    expect(parseCustomerPageParam('3')).toBe(3);
    expect(parseCustomerPageParam('0')).toBe(1);
    expect(parseCustomerPageParam('-2')).toBe(1);
    expect(parseCustomerPageParam('abc')).toBe(1);
  });

  it('calculates total pages and clamps out-of-range page', () => {
    expect(getCustomerTotalPages(0)).toBe(0);
    expect(getCustomerTotalPages(1)).toBe(1);
    expect(getCustomerTotalPages(20)).toBe(1);
    expect(getCustomerTotalPages(21)).toBe(2);
    expect(getCustomerTotalPages(40)).toBe(2);
    expect(getCustomerTotalPages(41)).toBe(3);

    expect(clampCustomerPage(5, 3)).toBe(3);
    expect(clampCustomerPage(0, 3)).toBe(1);
    expect(clampCustomerPage(2, 0)).toBe(1);
  });

  it('slices items by page size', () => {
    const items = Array.from({ length: 45 }, (_, index) => index + 1);

    expect(paginateCustomerItems(items, 1)).toEqual(items.slice(0, CUSTOMER_PAGE_SIZE));
    expect(paginateCustomerItems(items, 2)).toEqual(items.slice(CUSTOMER_PAGE_SIZE, CUSTOMER_PAGE_SIZE * 2));
    expect(paginateCustomerItems(items, 3)).toEqual(items.slice(CUSTOMER_PAGE_SIZE * 2));
    expect(paginateCustomerItems(items, 99)).toEqual(items.slice(CUSTOMER_PAGE_SIZE * 2));
    expect(paginateCustomerItems([], 2)).toEqual([]);
  });

  it('builds pagination items with ellipsis for large page counts', () => {
    expect(buildCustomerPaginationItems(1, 1)).toEqual([1]);
    expect(buildCustomerPaginationItems(2, 5)).toEqual([1, 2, 3, 'ellipsis', 5]);
    expect(buildCustomerPaginationItems(4, 8)).toEqual([1, 'ellipsis', 3, 4, 5, 'ellipsis', 8]);
    expect(buildCustomerPaginationItems(8, 8)).toEqual([1, 'ellipsis', 7, 8]);
    expect(buildCustomerPaginationItems(1, 0)).toEqual([]);
  });

  it('matches pagination shortcuts for latin and korean keys', () => {
    expect(getCustomerPaginationShortcutAction({ key: 'q', code: 'KeyQ', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBe('prev');
    expect(getCustomerPaginationShortcutAction({ key: 'Q', code: 'KeyQ', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBe('prev');
    expect(getCustomerPaginationShortcutAction({ key: 'ㅂ', code: 'KeyQ', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBe('prev');
    expect(getCustomerPaginationShortcutAction({ key: 'e', code: 'KeyE', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBe('next');
    expect(getCustomerPaginationShortcutAction({ key: 'E', code: 'KeyE', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBe('next');
    expect(getCustomerPaginationShortcutAction({ key: 'ㄷ', code: 'KeyE', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBe('next');
    expect(getCustomerPaginationShortcutAction({ key: 'a', code: 'KeyA', ctrlKey: false, metaKey: false, altKey: false, isComposing: false })).toBeNull();
    expect(getCustomerPaginationShortcutAction({ key: 'q', code: 'KeyQ', ctrlKey: true, metaKey: false, altKey: false, isComposing: false })).toBeNull();
    expect(getCustomerPaginationShortcutAction({ key: 'ㅂ', code: 'KeyQ', ctrlKey: false, metaKey: false, altKey: false, isComposing: true })).toBeNull();
  });

  it('preserves requested page until total pages are known', () => {
    expect(resolveSafeCustomerPage(2, 0, false)).toBe(2);
    expect(resolveSafeCustomerPage(5, 3, true)).toBe(3);
  });
});
