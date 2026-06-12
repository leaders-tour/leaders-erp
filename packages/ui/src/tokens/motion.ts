/** 공용 UI 모션 — Tailwind transition/animation 클래스 */
export const uiMotionTokens = {
  /** accommodation-destination-reveal 등과 동일한 ease-out */
  easingStandard: 'ease-[cubic-bezier(0.22,1,0.36,1)]',
  durationBase: 'duration-300',
  reduceMotion: 'motion-reduce:transition-none motion-reduce:animate-none',
  transitionPanelWidth:
    'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
  transitionFade:
    'transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
  transitionSlideIn:
    'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none',
} as const;
