import { parseEstimateGuidePageSplitsInput } from '../utils/guide-layout';
import type { EstimateGuideImagesPerPage } from '../model/types';

const PRESETS: Array<{ n: EstimateGuideImagesPerPage; label: string }> = [
  { n: 1, label: '크게 · 1장' },
  { n: 3, label: '추천 · 3장' },
];

export type EstimateGuideLayoutControlsDensity = 'compact' | 'comfortable';

export interface EstimateGuideLayoutControlsProps {
  estimateGuideImagesPerPage: EstimateGuideImagesPerPage;
  onEstimateGuideImagesPerPage: (value: EstimateGuideImagesPerPage) => void;
  estimateGuidePageSplitsText: string;
  onEstimateGuidePageSplitsText: (value: string) => void;
  splitsInputId: string;
  density?: EstimateGuideLayoutControlsDensity;
  className?: string;
}

export function EstimateGuideLayoutControls({
  estimateGuideImagesPerPage,
  onEstimateGuideImagesPerPage,
  estimateGuidePageSplitsText,
  onEstimateGuidePageSplitsText,
  splitsInputId,
  density = 'comfortable',
  className,
}: EstimateGuideLayoutControlsProps): JSX.Element {
  const isCompact = density === 'compact';
  const titleClass = isCompact
    ? 'w-full text-[11px] font-medium text-slate-600'
    : 'w-full text-sm font-medium text-slate-700';
  const labelClass = isCompact ? 'text-[11px] font-medium text-slate-600' : 'text-sm font-medium text-slate-700';

  const presetButtonClass = (active: boolean) =>
    isCompact
      ? `rounded-lg border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
          active
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`
      : `rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
          active
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`;

  const inputClass = isCompact
    ? 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1'
    : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1';

  const errorClass = isCompact ? 'text-[11px] text-rose-600' : 'text-xs text-rose-600';
  const splitsGap = isCompact ? 'mt-2.5 grid gap-1' : 'mt-3 grid gap-1.5';

  return (
    <div className={className} role="region" aria-label="안내 이미지 레이아웃 설정">
      <div className="flex flex-wrap items-center gap-1.5 gap-y-2">
        <span className={titleClass}>안내 이미지</span>
        {PRESETS.map(({ n, label }) => (
          <button
            key={n}
            type="button"
            onClick={() => onEstimateGuideImagesPerPage(n)}
            className={presetButtonClass(estimateGuideImagesPerPage === n)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={splitsGap}>
        <label className={labelClass} htmlFor={splitsInputId}>
          페이지별 장수 (선택)
        </label>
        <input
          id={splitsInputId}
          type="text"
          value={estimateGuidePageSplitsText}
          onChange={(event) => onEstimateGuidePageSplitsText(event.target.value)}
          placeholder="예: 3, 2, 2 · 비우면 균등(위 버튼)"
          className={inputClass}
          autoComplete="off"
        />
        {estimateGuidePageSplitsText.trim().length > 0 &&
        parseEstimateGuidePageSplitsInput(estimateGuidePageSplitsText) === null ? (
          <p className={errorClass}>
            숫자와 쉼표만 사용하세요. 인식할 수 없어 균등 설정으로 미리봅니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}
