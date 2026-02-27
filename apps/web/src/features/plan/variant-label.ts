const VARIANT_LABEL_BY_KEY: Record<string, string> = {
  basic: '기본',
  afternoon: '오후',
  extend: '연장',
  earlynight: '얼리(00-04)',
  earlymorning: '얼리(04-08)',
  earlynightextend: '얼리(00-04)+연장',
  earlymorningextend: '얼리(04-08)+연장',
};

function normalizeVariantKey(value: string): string {
  return value.replace(/[_\-\s]/g, '').toLowerCase();
}

export function toVariantLabel(value: string): string {
  return VARIANT_LABEL_BY_KEY[normalizeVariantKey(value)] ?? value;
}
