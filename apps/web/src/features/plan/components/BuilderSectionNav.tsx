import { useEffect, useState } from 'react';

export interface BuilderSectionNavItem {
  id: string;
  label: string;
  number: number;
}

export const BUILDER_SECTION_NAV_ITEMS: BuilderSectionNavItem[] = [
  { id: 'basic', label: '기본정보', number: 1 },
  { id: 'transport', label: '항공 및 이동', number: 2 },
  { id: 'route', label: '일정 선택', number: 3 },
  { id: 'extras', label: '추가 설정', number: 4 },
  { id: 'pricing', label: '금액', number: 5 },
  { id: 'schedule', label: '일정표 편집기', number: 6 },
];

export function useBuilderSectionSpy(
  items: BuilderSectionNavItem[],
  scrollRoot: HTMLElement | null,
): string | null {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (!scrollRoot || items.length === 0) {
      return;
    }

    const sections = items
      .map((item) => scrollRoot.querySelector<HTMLElement>(`#builder-section-${item.id}`))
      .filter((element): element is HTMLElement => element != null);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        const topMost = visible[0]?.target;
        if (topMost instanceof HTMLElement && topMost.id.startsWith('builder-section-')) {
          setActiveId(topMost.id.replace('builder-section-', ''));
        }
      },
      {
        root: scrollRoot,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.15, 0.4, 0.75, 1],
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [items, scrollRoot]);

  return activeId;
}

interface BuilderSectionNavProps {
  items: BuilderSectionNavItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function BuilderSectionNav({ items, activeId, onSelect }: BuilderSectionNavProps): JSX.Element {
  return (
    <nav
      aria-label="빌더 섹션 이동"
      className="sticky top-4 z-10 hidden w-11 shrink-0 self-start lg:block xl:w-12"
    >
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
        <ul className="grid gap-1">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSelect(item.id)}
                  className={`flex h-9 w-full items-center justify-center rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.number}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function scrollToBuilderSection(scrollRoot: HTMLElement | null, sectionId: string): void {
  const target = scrollRoot?.querySelector<HTMLElement>(`#builder-section-${sectionId}`);
  if (!target) {
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
