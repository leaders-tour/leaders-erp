import type { SetURLSearchParams } from 'react-router-dom';

export const LIST_FILTER_REPLACE = { replace: true } as const;

export function getQueryParam(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key) ?? '';
}

export function patchSearchParams(
  setSearchParams: SetURLSearchParams,
  patch: (params: URLSearchParams) => void,
): void {
  setSearchParams(
    (prev) => {
      patch(prev);
      return prev;
    },
    LIST_FILTER_REPLACE,
  );
}

export function setQueryParam(
  params: URLSearchParams,
  key: string,
  value: string,
  omitWhenEmpty = true,
): void {
  if (omitWhenEmpty && !value.trim()) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}

export function setOptionalQueryParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value == null || value === '') {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}

export function parseEnumParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  options?: { defaultValue?: T; allToken?: string },
): T | undefined {
  const allToken = options?.allToken ?? 'all';
  if (raw == null || raw === '') {
    return options?.defaultValue;
  }
  if (raw === allToken) {
    return undefined;
  }
  return allowed.includes(raw as T) ? (raw as T) : options?.defaultValue;
}

export function serializeEnumParam<T extends string>(
  value: T | undefined,
  options?: { defaultValue?: T; allToken?: string },
): string | undefined {
  const allToken = options?.allToken ?? 'all';
  if (value === undefined) {
    return allToken;
  }
  if (options?.defaultValue !== undefined && value === options.defaultValue) {
    return undefined;
  }
  return value;
}
