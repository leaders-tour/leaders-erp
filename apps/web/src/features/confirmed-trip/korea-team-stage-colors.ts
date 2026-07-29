import { KOREA_TEAM_STAGE_COLOR_TONES } from '@tour/validation';

export { KOREA_TEAM_STAGE_COLOR_TONES };

export type KoreaTeamStageColorTone = (typeof KOREA_TEAM_STAGE_COLOR_TONES)[number];

export const KOREA_TEAM_STAGE_COLOR_LABELS: Record<KoreaTeamStageColorTone, string> = {
  slate: '회색',
  blue: '파랑',
  emerald: '초록',
  amber: '노랑',
  rose: '분홍',
  violet: '보라',
  cyan: '청록',
  orange: '주황',
};

export const KOREA_TEAM_STAGE_CHIP_CLASS_BY_TONE: Record<KoreaTeamStageColorTone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  blue: 'bg-blue-100 text-blue-800 ring-blue-500/20',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-500/20',
  amber: 'bg-amber-100 text-amber-800 ring-amber-500/20',
  rose: 'bg-rose-100 text-rose-800 ring-rose-500/20',
  violet: 'bg-violet-100 text-violet-800 ring-violet-500/20',
  cyan: 'bg-cyan-100 text-cyan-800 ring-cyan-500/20',
  orange: 'bg-orange-100 text-orange-800 ring-orange-500/20',
};

export const DEFAULT_KOREA_TEAM_STAGE_CHIP_CLASS = KOREA_TEAM_STAGE_CHIP_CLASS_BY_TONE.slate;

export function koreaTeamStageChipClass(colorTone: string): string {
  if (colorTone in KOREA_TEAM_STAGE_CHIP_CLASS_BY_TONE) {
    return KOREA_TEAM_STAGE_CHIP_CLASS_BY_TONE[colorTone as KoreaTeamStageColorTone];
  }
  return DEFAULT_KOREA_TEAM_STAGE_CHIP_CLASS;
}

export function koreaTeamStageSwatchClass(colorTone: KoreaTeamStageColorTone): string {
  const map: Record<KoreaTeamStageColorTone, string> = {
    slate: 'bg-slate-400',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
  };
  return map[colorTone];
}
