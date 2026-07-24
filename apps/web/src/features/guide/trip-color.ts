export interface TripColor {
  bg: string;
  hover: string;
  text: string;
  textSelected: string;
}

export const REGION_COLOR_RULES: Array<{ keyword: string } & TripColor> = [
  {
    keyword: '고비',
    bg: 'bg-amber-500',
    hover: 'hover:bg-amber-600',
    text: 'text-amber-700',
    textSelected: 'text-amber-300',
  },
  {
    keyword: '홉스골',
    bg: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
    text: 'text-blue-700',
    textSelected: 'text-blue-300',
  },
  {
    keyword: '중부',
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    text: 'text-emerald-700',
    textSelected: 'text-emerald-300',
  },
  {
    keyword: '자브항',
    bg: 'bg-violet-500',
    hover: 'hover:bg-violet-600',
    text: 'text-violet-700',
    textSelected: 'text-violet-300',
  },
];

export const FALLBACK_COLOR: TripColor = {
  bg: 'bg-blue-500',
  hover: 'hover:bg-blue-600',
  text: 'text-blue-700',
  textSelected: 'text-blue-300',
};

export const NEUTRAL_DESTINATION_COLOR: Pick<TripColor, 'text' | 'textSelected'> = {
  text: 'text-slate-500',
  textSelected: 'text-slate-300',
};

export function getColorByDestination(destination: string): TripColor {
  const cleaned = destination.replace(/\s+/g, '');
  if (!cleaned || cleaned === '-') {
    return { ...FALLBACK_COLOR, ...NEUTRAL_DESTINATION_COLOR };
  }
  return REGION_COLOR_RULES.find((rule) => cleaned.includes(rule.keyword)) ?? FALLBACK_COLOR;
}
