export interface TripColor {
  bg: string;
  hover: string;
}

export const REGION_COLOR_RULES: Array<{ keyword: string } & TripColor> = [
  { keyword: '고비', bg: 'bg-amber-500', hover: 'hover:bg-amber-600' },
  { keyword: '홉스골', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { keyword: '중부', bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  { keyword: '자브항', bg: 'bg-violet-500', hover: 'hover:bg-violet-600' },
];

export const FALLBACK_COLOR: TripColor = { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' };

export function getColorByDestination(destination: string): TripColor {
  const cleaned = destination.replace(/\s+/g, '');
  return REGION_COLOR_RULES.find((r) => cleaned.includes(r.keyword)) ?? FALLBACK_COLOR;
}
