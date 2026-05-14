/**
 * 검색 입력 바로 아래에 붙는 플로팅 결과 목록(UI-only combobox 패턴).
 * 여행지 안내 · 기준 목적지 선택 등 재사용.
 *
 * 트리거는 `relative` 래퍼 안의 공용 `<Input>`; 패널은 같은 래퍼 자식으로 `top-full mt-1` 정렬한다.
 */
export const searchComboboxTokens = {
  /** 단계 블록: 제목 위 · 부제 아래 간격 포함 */
  section: {
    stack: 'grid gap-2',
    stepTitle: 'text-sm font-semibold text-slate-800',
    stepSubtitle: 'text-[11px] leading-relaxed text-slate-500',
  },
  field: {
    relativeWrap: 'relative min-w-0',
    /** `<Input>`에 덧붙일 폭 클래스 */
    triggerInput: 'w-full',
  },
  /**
   * 부착 패널: 입력 하단 전체폭, 얕은 그림자, 얇은 라운딩 스크롤바(webkit).
   */
  panel: [
    'absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto overscroll-y-contain',
    'rounded-xl border border-slate-200 bg-white p-1 shadow-lg',
    '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent',
    '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400',
  ].join(' '),
  emptyHint: 'px-3 py-2 text-sm text-slate-500',
  /** `type="button"` 옵션 행 전체 히트 영역 */
  optionRow:
    'flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm text-slate-800 transition-colors hover:bg-slate-100',
  /** 옵션 1째 줄 바로 아래 보조 줄(예: 지역명) */
  optionSubtitle: 'text-[11px] text-slate-500',
} as const;
