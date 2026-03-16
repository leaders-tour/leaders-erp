const VARIANT_LABEL_BY_KEY: Record<string, string> = {
  basic: '기본',
  afternoon: '오후',
  extend: '연장',
  early: '얼리',
  earlyextend: '얼리+연장',
};

function normalizeVariantKey(value: string): string {
  return value.replace(/[_\-\s]/g, '').toLowerCase();
}

export function toVariantLabel(value: string): string {
  return VARIANT_LABEL_BY_KEY[normalizeVariantKey(value)] ?? value;
}
