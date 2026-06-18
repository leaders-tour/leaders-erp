import { useLayoutEffect, type RefObject } from 'react';

const DEFAULT_MAX_PAGE1_FIT_SCALE = 1.16;
const DEFAULT_MIN_PAGE1_FIT_SCALE = 0.72;

export interface UsePage1FitScaleOptions {
  pageRef: RefObject<HTMLElement | null>;
  heroRef: RefObject<HTMLElement | null>;
  bodyShellRef: RefObject<HTMLElement | null>;
  bodyFitRef: RefObject<HTMLElement | null>;
  footerRef?: RefObject<HTMLElement | null>;
  fitScaleCssVar: string;
  layoutReadyDataAttr: string;
  maxScale?: number;
  minScale?: number;
  onLayoutReady?: () => void;
  deps?: readonly unknown[];
}

export function usePage1FitScale({
  pageRef,
  heroRef,
  bodyShellRef,
  bodyFitRef,
  footerRef,
  fitScaleCssVar,
  layoutReadyDataAttr,
  maxScale = DEFAULT_MAX_PAGE1_FIT_SCALE,
  minScale = DEFAULT_MIN_PAGE1_FIT_SCALE,
  onLayoutReady,
  deps = [],
}: UsePage1FitScaleOptions): void {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const pageElement = pageRef.current;
    const heroElement = heroRef.current;
    const bodyShellElement = bodyShellRef.current;
    const bodyFitElement = bodyFitRef.current;

    if (!pageElement || !heroElement || !bodyShellElement || !bodyFitElement) {
      return undefined;
    }

    let animationFrameId = 0;

    const setScale = (value: number) => {
      const nextValue = value.toFixed(4);
      if (pageElement.style.getPropertyValue(fitScaleCssVar) !== nextValue) {
        pageElement.style.setProperty(fitScaleCssVar, nextValue);
      }
    };

    const markLayoutReady = () => {
      pageElement.setAttribute(layoutReadyDataAttr, 'true');
      onLayoutReady?.();
    };

    const measureContentHeight = (scale: number): number => {
      setScale(scale);
      return bodyFitElement.scrollHeight;
    };

    const recalcScale = () => {
      pageElement.removeAttribute(layoutReadyDataAttr);
      const availableHeight = bodyShellElement.clientHeight;
      if (availableHeight <= 0) {
        setScale(1);
        markLayoutReady();
        return;
      }

      const fitsInSlot = (height: number) => height <= availableHeight + 1;
      const naturalHeight = measureContentHeight(1);

      if (fitsInSlot(naturalHeight)) {
        const maxHeight = measureContentHeight(maxScale);
        if (fitsInSlot(maxHeight)) {
          setScale(maxScale);
          markLayoutReady();
          return;
        }

        let low = 1;
        let high = maxScale;
        let best = low;

        for (let index = 0; index < 8; index += 1) {
          const mid = (low + high) / 2;
          if (fitsInSlot(measureContentHeight(mid))) {
            best = mid;
            low = mid;
          } else {
            high = mid;
          }
        }

        setScale(best);
        markLayoutReady();
        return;
      }

      const minimumHeight = measureContentHeight(minScale);
      if (!fitsInSlot(minimumHeight)) {
        setScale(minScale);
        markLayoutReady();
        return;
      }

      let low = minScale;
      let high = 1;
      let best = low;

      for (let index = 0; index < 8; index += 1) {
        const mid = (low + high) / 2;
        if (fitsInSlot(measureContentHeight(mid))) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      setScale(best);
      markLayoutReady();
    };

    const scheduleRecalc = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(recalcScale);
    };

    scheduleRecalc();

    const resizeObserver = new ResizeObserver(() => {
      scheduleRecalc();
    });

    resizeObserver.observe(pageElement);
    resizeObserver.observe(heroElement);
    resizeObserver.observe(bodyShellElement);
    const footerElement = footerRef?.current;
    if (footerElement) {
      resizeObserver.observe(footerElement);
    }

    window.addEventListener('resize', scheduleRecalc);
    window.addEventListener('beforeprint', recalcScale);
    window.addEventListener('afterprint', scheduleRecalc);
    void document.fonts?.ready.then(() => {
      scheduleRecalc();
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleRecalc);
      window.removeEventListener('beforeprint', recalcScale);
      window.removeEventListener('afterprint', scheduleRecalc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit deps from callers
  }, deps);
}
