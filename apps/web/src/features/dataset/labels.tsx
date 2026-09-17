import { datasetTheme } from './theme';

export type CatalogPlaceType = 'LODGING' | 'EXPERIENCE' | 'MEETING' | 'GATE' | 'AREA';
export type CatalogUsageStatus = 'ACTIVE' | 'INACTIVE';
export type CatalogElementComposition = 'SINGLE' | 'SET';
export type CatalogElementKind = 'MEETING' | 'TRANSFER' | 'MEAL' | 'EXPERIENCE' | 'MIXED';
export type CatalogBlockShape = 'DAY' | 'SET';

export const PLACE_TYPE_LABEL: Record<CatalogPlaceType, string> = {
  LODGING: '숙소',
  EXPERIENCE: '체험장',
  MEETING: '미팅 장소',
  GATE: '출입 지점',
  AREA: '권역',
};

export const ELEMENT_KIND_LABEL: Record<CatalogElementKind, string> = {
  MEETING: '미팅',
  TRANSFER: '이동',
  MEAL: '식사',
  EXPERIENCE: '체험',
  MIXED: '혼합',
};

export const STATUS_LABEL: Record<CatalogUsageStatus, string> = {
  ACTIVE: '사용 중',
  INACTIVE: '사용 안 함',
};

export function StatusBadge({ status }: { status: CatalogUsageStatus }): JSX.Element {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/80' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TypePill({
  label,
  tone = 'slate',
}: {
  label: string;
  tone?: 'slate' | 'violet' | 'sky' | 'amber';
}): JSX.Element {
  const toneClass =
    tone === 'violet'
      ? 'bg-[#EDE9FE] text-[#5B4BD6] ring-1 ring-inset ring-[#D9D2F8]'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100'
          : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>{label}</span>;
}

export function DatasetStubNotice({ message }: { message: string }): JSX.Element {
  return (
    <div
      className={`rounded-xl border border-[#D9D2F8] bg-[#F3F0FF] px-3 py-2 text-sm ${datasetTheme.selectionText}`}
      role="status"
    >
      {message}
    </div>
  );
}

export function DatasetPageFooter({ screenId }: { screenId: string }): JSX.Element {
  return (
    <p className="text-xs text-[#9A93C2]">
      {screenId} · 일정 데이터 관리 · 화면 검토안 v0.1 (실험)
    </p>
  );
}

export function MapLink({ href }: { href: string }): JSX.Element {
  return (
    <a className={`inline-flex items-center gap-1 text-sm font-medium ${datasetTheme.link}`} href={href} target="_blank" rel="noreferrer">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
          clipRule="evenodd"
        />
      </svg>
      지도 보기
    </a>
  );
}
