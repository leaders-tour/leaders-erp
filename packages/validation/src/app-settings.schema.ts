import { z } from 'zod';

export const movementIntensityLevels = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'] as const;

export const appSettingKeySchema = z.enum(['appearance']);

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'HEX color must be #RRGGBB');

export const movementIntensityColorSchema = z.object({
  level: z.enum(movementIntensityLevels),
  color: hexColorSchema.transform((value) => value.toLowerCase()),
});

export const rentalItemSharedQuantityRuleSchema = z.object({
  id: z.string().min(1).max(100),
  minHeadcount: z.number().int().min(1).max(1000),
  maxHeadcount: z.number().int().min(1).max(1000).nullable(),
  quantity: z.number().int().min(1).max(1000),
});

export const rentalItemPresetItemSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  unit: z.string().min(0).max(20),
  quantityFormula: z.string().min(1).max(500),
}).superRefine((value, ctx) => {
  try {
    evaluateRentalItemQuantityFormula(value.quantityFormula, 6);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : '수식이 올바르지 않습니다.',
      path: ['quantityFormula'],
    });
  }
});

export const rentalItemPresetSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  current: z.boolean().default(false),
  sharedQuantityRules: z.array(rentalItemSharedQuantityRuleSchema).min(1).max(100),
  items: z.array(rentalItemPresetItemSchema).min(1).max(100),
}).superRefine((value, ctx) => {
  for (const issue of validateRentalItemSharedQuantityRules(value.sharedQuantityRules)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue,
      path: ['sharedQuantityRules'],
    });
  }
});

export const tourListRentalItemTypes = ['DRONE', 'STARLINK', 'POWERBANK'] as const;

export const tourListRentalItemStockSchema = z.object({
  DRONE: z.number().int().min(0).max(1000),
  STARLINK: z.number().int().min(0).max(1000),
  POWERBANK: z.number().int().min(0).max(1000),
});

export const FLIGHT_TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_FLIGHT_TIME_SHORTCUT_COUNT = 48;

export const flightTimeShortcutSchema = z.string().regex(FLIGHT_TIME_HH_MM_REGEX, 'time must be HH:mm');

export const DEFAULT_FLIGHT_IN_TIME_SHORTCUTS = [
  '00:05',
  '00:30',
  '00:50',
  '02:45',
  '04:30',
  '11:10',
  '12:40',
  '13:20',
  '17:00',
  '18:10',
  '23:05',
  '23:30',
] as const;

export const DEFAULT_FLIGHT_OUT_TIME_SHORTCUTS = [
  '00:25',
  '00:50',
  '01:30',
  '01:50',
  '02:05',
  '08:40',
  '11:00',
  '13:00',
  '13:40',
  '14:50',
  '18:15',
  '20:30',
] as const;

export const DEFAULT_FLIGHT_TIME_AUTO_IN = '02:45';
export const DEFAULT_FLIGHT_TIME_AUTO_OUT = '18:15';

export const flightTimeSettingsSchema = z
  .object({
    inTimeShortcuts: z.array(flightTimeShortcutSchema).min(1).max(MAX_FLIGHT_TIME_SHORTCUT_COUNT),
    outTimeShortcuts: z.array(flightTimeShortcutSchema).min(1).max(MAX_FLIGHT_TIME_SHORTCUT_COUNT),
    defaultInTime: flightTimeShortcutSchema,
    defaultOutTime: flightTimeShortcutSchema,
  })
  .superRefine((value, ctx) => {
    const inDuplicates = findDuplicateFlightTimeShortcuts(value.inTimeShortcuts);
    for (const time of inDuplicates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `IN 단축키 "${time}"가 중복되었습니다.`,
        path: ['inTimeShortcuts'],
      });
    }
    const outDuplicates = findDuplicateFlightTimeShortcuts(value.outTimeShortcuts);
    for (const time of outDuplicates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `OUT 단축키 "${time}"가 중복되었습니다.`,
        path: ['outTimeShortcuts'],
      });
    }
    if (!value.inTimeShortcuts.includes(value.defaultInTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '자동 IN 초기값은 IN 단축키 목록에 포함되어야 합니다.',
        path: ['defaultInTime'],
      });
    }
    if (!value.outTimeShortcuts.includes(value.defaultOutTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '자동 OUT 초기값은 OUT 단축키 목록에 포함되어야 합니다.',
        path: ['defaultOutTime'],
      });
    }
  });

export const appSettingsPayloadSchema = z.object({
  movementIntensityColors: z.array(movementIntensityColorSchema),
  rentalItemPresets: z.array(rentalItemPresetSchema).min(1).max(50),
  tourListRentalItemStock: tourListRentalItemStockSchema,
  flightTimeSettings: flightTimeSettingsSchema,
});

export type AppSettingKey = z.infer<typeof appSettingKeySchema>;
export type MovementIntensityLevel = z.infer<typeof movementIntensityColorSchema>['level'];
export type MovementIntensityColor = z.infer<typeof movementIntensityColorSchema>;
export type RentalItemSharedQuantityRule = z.infer<typeof rentalItemSharedQuantityRuleSchema>;
export type RentalItemPresetItem = z.infer<typeof rentalItemPresetItemSchema>;
export type RentalItemPreset = z.infer<typeof rentalItemPresetSchema>;
export type TourListRentalItemType = (typeof tourListRentalItemTypes)[number];
export type TourListRentalItemStock = z.infer<typeof tourListRentalItemStockSchema>;
export type FlightTimeSettings = z.infer<typeof flightTimeSettingsSchema>;
export type AppSettingsPayload = z.infer<typeof appSettingsPayloadSchema>;

export const APP_SETTINGS_KEY_APPEARANCE: AppSettingKey = 'appearance';

export const DEFAULT_MOVEMENT_INTENSITY_COLORS: MovementIntensityColor[] = [
  { level: 'LEVEL_1', color: '#8bb058' },
  { level: 'LEVEL_2', color: '#ffcd4a' },
  { level: 'LEVEL_3', color: '#fd9f28' },
  { level: 'LEVEL_4', color: '#fc5230' },
  { level: 'LEVEL_5', color: '#111111' },
];

export const DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES: RentalItemSharedQuantityRule[] = [
  { id: 'shared-1-4', minHeadcount: 1, maxHeadcount: 4, quantity: 1 },
  { id: 'shared-5-8', minHeadcount: 5, maxHeadcount: 8, quantity: 2 },
  { id: 'shared-9', minHeadcount: 9, maxHeadcount: 9, quantity: 3 },
  { id: 'shared-10-plus', minHeadcount: 10, maxHeadcount: null, quantity: 4 },
];

export const DEFAULT_RENTAL_ITEM_PRESETS: RentalItemPreset[] = [
  {
    id: 'default-rental-items',
    name: '기본 대여물품',
    current: true,
    sharedQuantityRules: DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
    items: [
      { id: 'poncho', label: '판초', unit: '개', quantityFormula: '전체인원' },
      { id: 'mosquito-net', label: '모기장', unit: '개', quantityFormula: '전체인원' },
      { id: 'sled', label: '썰매', unit: '개', quantityFormula: '전체인원' },
      { id: 'mat', label: '돗자리', unit: '개', quantityFormula: '공용수량' },
      { id: 'star-laser', label: '별레이저', unit: '개', quantityFormula: '1' },
      { id: 'lantern', label: '랜턴', unit: '개', quantityFormula: '1' },
      { id: 'power-strip', label: '멀티탭', unit: '개', quantityFormula: '공용수량' },
      { id: 'dryer', label: '드라이기', unit: '개', quantityFormula: '1' },
      { id: 'board-game', label: '보드게임', unit: '종', quantityFormula: '1' },
      { id: 'burner-pot-pan', label: '버너/냄비/팬', unit: 'set', quantityFormula: '1' },
    ],
  },
];

export const DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK: TourListRentalItemStock = {
  DRONE: 10,
  STARLINK: 5,
  POWERBANK: 2,
};

export const TOUR_LIST_RENTAL_ITEM_LABELS: Record<TourListRentalItemType, string> = {
  DRONE: '드론',
  STARLINK: '스타링크',
  POWERBANK: '파워뱅크',
};

export const DEFAULT_FLIGHT_TIME_SETTINGS: FlightTimeSettings = {
  inTimeShortcuts: [...DEFAULT_FLIGHT_IN_TIME_SHORTCUTS],
  outTimeShortcuts: [...DEFAULT_FLIGHT_OUT_TIME_SHORTCUTS],
  defaultInTime: DEFAULT_FLIGHT_TIME_AUTO_IN,
  defaultOutTime: DEFAULT_FLIGHT_TIME_AUTO_OUT,
};

export const APP_SETTINGS_DEFAULT: AppSettingsPayload = {
  movementIntensityColors: DEFAULT_MOVEMENT_INTENSITY_COLORS,
  rentalItemPresets: DEFAULT_RENTAL_ITEM_PRESETS,
  tourListRentalItemStock: DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK,
  flightTimeSettings: DEFAULT_FLIGHT_TIME_SETTINGS,
};

export function isValidFlightTimeShortcut(value: string): boolean {
  return FLIGHT_TIME_HH_MM_REGEX.test(value.trim());
}

export function normalizeFlightTimeShortcut(value: string): string | null {
  const trimmed = value.trim();
  return isValidFlightTimeShortcut(trimmed) ? trimmed : null;
}

function findDuplicateFlightTimeShortcuts(times: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const time of times) {
    if (seen.has(time)) {
      duplicates.add(time);
    }
    seen.add(time);
  }
  return [...duplicates];
}

function dedupeFlightTimeShortcutsPreserveOrder(times: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of times) {
    const normalized = normalizeFlightTimeShortcut(raw);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function resolveDefaultFlightTime(
  shortcuts: readonly string[],
  preferredDefault: unknown,
  fallbackDefault: string,
): string {
  const preferred = normalizeFlightTimeShortcut(typeof preferredDefault === 'string' ? preferredDefault : '');
  if (preferred && shortcuts.includes(preferred)) {
    return preferred;
  }
  if (shortcuts.includes(fallbackDefault)) {
    return fallbackDefault;
  }
  return shortcuts[0] ?? fallbackDefault;
}

export function normalizeFlightTimeSettings(value: unknown): FlightTimeSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const parsed = flightTimeSettingsSchema.safeParse({
    inTimeShortcuts: Array.isArray(raw.inTimeShortcuts) ? raw.inTimeShortcuts : undefined,
    outTimeShortcuts: Array.isArray(raw.outTimeShortcuts) ? raw.outTimeShortcuts : undefined,
    defaultInTime: raw.defaultInTime,
    defaultOutTime: raw.defaultOutTime,
  });
  if (parsed.success) {
    return parsed.data;
  }

  const inTimeShortcuts = dedupeFlightTimeShortcutsPreserveOrder(
    Array.isArray(raw.inTimeShortcuts) ? raw.inTimeShortcuts.map(String) : DEFAULT_FLIGHT_IN_TIME_SHORTCUTS,
  );
  const outTimeShortcuts = dedupeFlightTimeShortcutsPreserveOrder(
    Array.isArray(raw.outTimeShortcuts) ? raw.outTimeShortcuts.map(String) : DEFAULT_FLIGHT_OUT_TIME_SHORTCUTS,
  );

  const normalizedInTimeShortcuts =
    inTimeShortcuts.length > 0 ? inTimeShortcuts : [...DEFAULT_FLIGHT_IN_TIME_SHORTCUTS];
  const normalizedOutTimeShortcuts =
    outTimeShortcuts.length > 0 ? outTimeShortcuts : [...DEFAULT_FLIGHT_OUT_TIME_SHORTCUTS];

  return {
    inTimeShortcuts: normalizedInTimeShortcuts,
    outTimeShortcuts: normalizedOutTimeShortcuts,
    defaultInTime: resolveDefaultFlightTime(
      normalizedInTimeShortcuts,
      raw.defaultInTime,
      DEFAULT_FLIGHT_TIME_AUTO_IN,
    ),
    defaultOutTime: resolveDefaultFlightTime(
      normalizedOutTimeShortcuts,
      raw.defaultOutTime,
      DEFAULT_FLIGHT_TIME_AUTO_OUT,
    ),
  };
}

export function collectFlightTimeSettingsIssues(settings: {
  inTimeShortcuts: readonly string[];
  outTimeShortcuts: readonly string[];
  defaultInTime: string;
  defaultOutTime: string;
}): string[] {
  const issues: string[] = [];

  for (const [label, times] of [
    ['IN', settings.inTimeShortcuts],
    ['OUT', settings.outTimeShortcuts],
  ] as const) {
    if (times.length === 0) {
      issues.push(`${label} 단축키 목록이 비어 있습니다.`);
    }
    if (times.length > MAX_FLIGHT_TIME_SHORTCUT_COUNT) {
      issues.push(`${label} 단축키는 최대 ${MAX_FLIGHT_TIME_SHORTCUT_COUNT}개까지 등록할 수 있습니다.`);
    }
    const seen = new Set<string>();
    for (const time of times) {
      if (!isValidFlightTimeShortcut(time)) {
        issues.push(`${label} 단축키 "${time}" 형식이 올바르지 않습니다. (HH:mm)`);
      }
      if (seen.has(time)) {
        issues.push(`${label} 단축키 "${time}"가 중복되었습니다.`);
      }
      seen.add(time);
    }
  }

  if (!settings.inTimeShortcuts.includes(settings.defaultInTime)) {
    issues.push('자동 IN 초기값은 IN 단축키 목록에 포함되어야 합니다.');
  }
  if (!settings.outTimeShortcuts.includes(settings.defaultOutTime)) {
    issues.push('자동 OUT 초기값은 OUT 단축키 목록에 포함되어야 합니다.');
  }

  return issues;
}

export function pickClosestFlightTime(
  options: readonly string[],
  target: string,
  fallback: string,
): string {
  if (options.length === 0) {
    return fallback;
  }
  if (!target || target.length < 4) {
    return fallback;
  }
  const [th, tm] = target.split(':').map(Number);
  const targetMin = (th ?? 0) * 60 + (tm ?? 0);
  let best = options[0] ?? fallback;
  let bestDiff = Infinity;
  for (const opt of options) {
    const [oh, om] = opt.split(':').map(Number);
    const optMin = (oh ?? 0) * 60 + (om ?? 0);
    const diff = Math.abs(optMin - targetMin);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = opt;
    }
  }
  return best;
}

type FormulaToken =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma'; value: ',' }
  | { type: 'question'; value: '?' }
  | { type: 'colon'; value: ':' };

type FormulaContext = {
  total: number;
  shared: number;
};

function isSharedQuantityRuleArray(
  value: unknown,
): value is readonly RentalItemSharedQuantityRule[] {
  return Array.isArray(value);
}

const FORMULA_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  ceil: Math.ceil,
  올림: Math.ceil,
  floor: Math.floor,
  내림: Math.floor,
  round: Math.round,
  반올림: Math.round,
  min: Math.min,
  최소: Math.min,
  max: Math.max,
  최대: Math.max,
};

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_가-힣]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_가-힣]/.test(char);
}

export function validateRentalItemSharedQuantityRules(
  rules: readonly RentalItemSharedQuantityRule[],
): string[] {
  if (rules.length === 0) {
    return ['공용 수량 규칙을 1개 이상 입력해 주세요.'];
  }

  const sortedRules = [...rules].sort((a, b) => a.minHeadcount - b.minHeadcount);
  const issues: string[] = [];

  if (sortedRules[0]?.minHeadcount !== 1) {
    issues.push('공용 수량 규칙은 1명부터 시작해야 합니다.');
  }

  sortedRules.forEach((rule, index) => {
    if (rule.maxHeadcount !== null && rule.maxHeadcount < rule.minHeadcount) {
      issues.push(`${rule.minHeadcount}명 구간의 종료 인원이 시작 인원보다 작습니다.`);
    }
    if (rule.maxHeadcount === null && index !== sortedRules.length - 1) {
      issues.push('마지막 구간만 "이상"으로 설정할 수 있습니다.');
    }

    const previous = sortedRules[index - 1];
    if (!previous) {
      return;
    }
    if (previous.maxHeadcount === null) {
      issues.push('마지막 "이상" 구간 뒤에 다른 구간을 둘 수 없습니다.');
      return;
    }
    if (rule.minHeadcount <= previous.maxHeadcount) {
      issues.push(`${rule.minHeadcount}명 구간이 앞 구간과 겹칩니다.`);
      return;
    }
    if (rule.minHeadcount > previous.maxHeadcount + 1) {
      issues.push(`${previous.maxHeadcount + 1}명 구간이 비어 있습니다.`);
    }
  });

  if (sortedRules[sortedRules.length - 1]?.maxHeadcount !== null) {
    issues.push('마지막 구간은 "이상"으로 설정해야 합니다.');
  }

  return [...new Set(issues)];
}

export function getSharedRentalItemCount(
  total: number,
  rules: readonly RentalItemSharedQuantityRule[] = DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
): number {
  const safeTotal = Math.max(1, Math.round(total));
  const validRules =
    validateRentalItemSharedQuantityRules(rules).length === 0
      ? [...rules].sort((a, b) => a.minHeadcount - b.minHeadcount)
      : DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES;
  const matchedRule = validRules.find(
    (rule) =>
      safeTotal >= rule.minHeadcount &&
      (rule.maxHeadcount === null || safeTotal <= rule.maxHeadcount),
  );
  return matchedRule?.quantity ?? DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES[0]!.quantity;
}

function tokenizeFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index];

    if (!char) {
      break;
    }
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const start = index;
      index += 1;
      while (index < formula.length && /[0-9.]/.test(formula[index] ?? '')) {
        index += 1;
      }
      const raw = formula.slice(start, index);
      if (!/^\d+(\.\d+)?$/.test(raw)) {
        throw new Error('수식 숫자 형식이 올바르지 않습니다.');
      }
      tokens.push({ type: 'number', value: Number(raw) });
      continue;
    }
    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (index < formula.length && isIdentifierPart(formula[index] ?? '')) {
        index += 1;
      }
      tokens.push({ type: 'identifier', value: formula.slice(start, index) });
      continue;
    }

    const twoChar = formula.slice(index, index + 2);
    if (['>=', '<=', '==', '!='].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar });
      index += 2;
      continue;
    }
    if (['+', '-', '*', '/', '>', '<'].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'comma', value: char });
      index += 1;
      continue;
    }
    if (char === '?') {
      tokens.push({ type: 'question', value: char });
      index += 1;
      continue;
    }
    if (char === ':') {
      tokens.push({ type: 'colon', value: char });
      index += 1;
      continue;
    }

    throw new Error('허용되지 않는 수식 문자가 있습니다.');
  }

  return tokens;
}

class RentalItemFormulaParser {
  private index = 0;

  constructor(
    private readonly tokens: FormulaToken[],
    private readonly context: FormulaContext,
  ) {}

  parse(): number {
    const value = this.parseConditional();
    if (this.peek()) {
      throw new Error('수식 끝에 해석할 수 없는 내용이 있습니다.');
    }
    return value;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.index];
  }

  private consume(): FormulaToken {
    const token = this.tokens[this.index];
    if (!token) {
      throw new Error('수식이 완성되지 않았습니다.');
    }
    this.index += 1;
    return token;
  }

  private match(type: FormulaToken['type'], value?: string): boolean {
    const token = this.peek();
    if (!token || token.type !== type || (value !== undefined && 'value' in token && String(token.value) !== value)) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private parseConditional(): number {
    const condition = this.parseComparison();
    if (!this.match('question')) {
      return condition;
    }
    const whenTrue = this.parseConditional();
    if (!this.match('colon')) {
      throw new Error('삼항 조건식에는 : 가 필요합니다.');
    }
    const whenFalse = this.parseConditional();
    return condition !== 0 ? whenTrue : whenFalse;
  }

  private parseComparison(): number {
    let left = this.parseAdditive();
    while (true) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || !['>=', '<=', '==', '!=', '>', '<'].includes(token.value)) {
        return left;
      }
      this.consume();
      const right = this.parseAdditive();
      switch (token.value) {
        case '>=':
          left = left >= right ? 1 : 0;
          break;
        case '<=':
          left = left <= right ? 1 : 0;
          break;
        case '==':
          left = left === right ? 1 : 0;
          break;
        case '!=':
          left = left !== right ? 1 : 0;
          break;
        case '>':
          left = left > right ? 1 : 0;
          break;
        case '<':
          left = left < right ? 1 : 0;
          break;
      }
    }
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();
    while (true) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || !['+', '-'].includes(token.value)) {
        return value;
      }
      this.consume();
      const right = this.parseMultiplicative();
      value = token.value === '+' ? value + right : value - right;
    }
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();
    while (true) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || !['*', '/'].includes(token.value)) {
        return value;
      }
      this.consume();
      const right = this.parseUnary();
      value = token.value === '*' ? value * right : value / right;
    }
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token?.type === 'operator' && token.value === '-') {
      this.consume();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.consume();
    if (token.type === 'number') {
      return token.value;
    }
    if (token.type === 'identifier') {
      if (this.match('paren', '(')) {
        const fn = FORMULA_FUNCTIONS[token.value];
        if (!fn) {
          throw new Error('허용되지 않는 함수입니다.');
        }
        const args: number[] = [];
        if (!this.match('paren', ')')) {
          do {
            args.push(this.parseConditional());
          } while (this.match('comma'));
          if (!this.match('paren', ')')) {
            throw new Error('함수 호출 괄호가 닫히지 않았습니다.');
          }
        }
        return fn(...args);
      }
      if (token.value === 'total' || token.value === '전체인원') {
        return this.context.total;
      }
      if (token.value === 'shared' || token.value === '공용수량') {
        return this.context.shared;
      }
      throw new Error('허용되지 않는 변수입니다.');
    }
    if (token.type === 'paren' && token.value === '(') {
      const value = this.parseConditional();
      if (!this.match('paren', ')')) {
        throw new Error('괄호가 닫히지 않았습니다.');
      }
      return value;
    }

    throw new Error('수식 구문이 올바르지 않습니다.');
  }
}

export function evaluateRentalItemQuantityFormula(
  formula: string,
  total: number,
  presetOrRules?: Pick<RentalItemPreset, 'sharedQuantityRules'> | readonly RentalItemSharedQuantityRule[],
): number {
  const safeTotal = Math.max(1, Math.round(total));
  const sharedQuantityRules = isSharedQuantityRuleArray(presetOrRules)
    ? presetOrRules
    : presetOrRules?.sharedQuantityRules;
  const parser = new RentalItemFormulaParser(tokenizeFormula(formula), {
    total: safeTotal,
    shared: getSharedRentalItemCount(safeTotal, sharedQuantityRules),
  });
  const value = parser.parse();
  if (!Number.isFinite(value)) {
    throw new Error('수식 결과가 유효한 숫자가 아닙니다.');
  }
  return Math.max(0, Math.round(value));
}

export function renderRentalItemPresetText(preset: RentalItemPreset, total: number): string {
  return preset.items
    .map((item) => {
      const quantity = evaluateRentalItemQuantityFormula(item.quantityFormula, total, preset);
      return `${item.label} ${quantity}${item.unit}`;
    })
    .join(', ');
}

export function getCurrentRentalItemPreset(presets: readonly RentalItemPreset[]): RentalItemPreset {
  return presets.find((preset) => preset.current) ?? presets[0] ?? DEFAULT_RENTAL_ITEM_PRESETS[0]!;
}

function normalizeRentalItemPresets(value: unknown): RentalItemPreset[] {
  const source = normalizeRentalItemPresetCandidates(value);
  const validPresets = source.filter((preset) => {
    try {
      preset.items.forEach((item) => evaluateRentalItemQuantityFormula(item.quantityFormula, 6, preset));
      return true;
    } catch {
      return false;
    }
  });
  const normalizedSource = validPresets.length > 0 ? validPresets : DEFAULT_RENTAL_ITEM_PRESETS;
  let hasCurrent = false;
  return normalizedSource.map((preset, index) => {
    const current = preset.current && !hasCurrent;
    if (current) {
      hasCurrent = true;
    }
    return {
      ...preset,
      current,
    };
  }).map((preset, index, presets) => ({
    ...preset,
    current: presets.some((item) => item.current) ? preset.current : index === 0,
  }));
}

function normalizeRentalItemPresetCandidates(value: unknown): RentalItemPreset[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_RENTAL_ITEM_PRESETS;
  }

  const candidates = value
    .map((preset) => {
      if (!preset || typeof preset !== 'object') {
        return null;
      }
      const rawPreset = preset as Record<string, unknown>;
      return {
        ...rawPreset,
        sharedQuantityRules:
          Array.isArray(rawPreset.sharedQuantityRules) && rawPreset.sharedQuantityRules.length > 0
            ? rawPreset.sharedQuantityRules
          : DEFAULT_RENTAL_ITEM_SHARED_QUANTITY_RULES,
      };
    })
    .filter((preset) => preset !== null);

  const parsed = z.array(rentalItemPresetSchema).safeParse(candidates);
  return parsed.success && parsed.data.length > 0 ? parsed.data : DEFAULT_RENTAL_ITEM_PRESETS;
}

export function normalizeAppSettingsPayload(value: unknown): AppSettingsPayload {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const colorByLevel = new Map<MovementIntensityLevel, string>();
  const parsedColors = z.array(movementIntensityColorSchema).safeParse(raw.movementIntensityColors);
  if (parsedColors.success) {
    for (const item of parsedColors.data) {
      colorByLevel.set(item.level, item.color);
    }
  }

  const parsedStock = tourListRentalItemStockSchema.safeParse(raw.tourListRentalItemStock);

  return {
    movementIntensityColors: DEFAULT_MOVEMENT_INTENSITY_COLORS.map((item) => ({
      level: item.level,
      color: colorByLevel.get(item.level) ?? item.color,
    })),
    rentalItemPresets: normalizeRentalItemPresets(raw.rentalItemPresets),
    tourListRentalItemStock: parsedStock.success
      ? parsedStock.data
      : DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK,
    flightTimeSettings: normalizeFlightTimeSettings(raw.flightTimeSettings),
  };
}

export function parseAppSettingsPayload(value: unknown): AppSettingsPayload {
  return appSettingsPayloadSchema.parse(normalizeAppSettingsPayload(value));
}
