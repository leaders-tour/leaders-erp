import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const DEFAULT_ESTIMATE_PREVIEW_BASE_WIDTH = 760;

interface EstimatePreviewScalerProps {
  children: ReactNode;
  baseWidth?: number;
  /** true면 컨테이너가 baseWidth보다 넓을 때 확대 (기본은 축소만) */
  allowUpscale?: boolean;
}

export function EstimatePreviewScaler({
  children,
  baseWidth = DEFAULT_ESTIMATE_PREVIEW_BASE_WIDTH,
  allowUpscale = false,
}: EstimatePreviewScalerProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return undefined;
    }

    let frameId = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) {
        return;
      }

      const availableWidth = container.clientWidth;
      const rawScale = availableWidth > 0 ? availableWidth / baseWidth : 1;
      const scale = allowUpscale ? rawScale : Math.min(1, rawScale);
      const height = Math.ceil(content.scrollHeight * scale);
      setLayout((current) =>
        Math.abs(current.scale - scale) < 0.0001 && current.height === height
          ? current
          : { scale, height },
      );
    };

    const scheduleMeasure = () => {
      if (disposed) {
        return;
      }

      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : undefined;
    observer?.observe(container);
    observer?.observe(content);
    window.addEventListener('resize', scheduleMeasure);
    void document.fonts?.ready.then(scheduleMeasure);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [allowUpscale, baseWidth]);

  return (
    <div
      ref={containerRef}
      className="estimate-preview-scaler"
      style={{ height: layout.height || undefined }}
    >
      <div
        ref={contentRef}
        className="estimate-preview-scaler__content"
        style={{ width: baseWidth, transform: `translateX(-50%) scale(${layout.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
