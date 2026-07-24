import { Card, Input } from '@tour/ui';
import { TooltipHelpIcon } from '../../../components/TooltipHelpIcon';
import {
  CUSTOMER_TRIP_STATUS_CHIP_CLASS,
  CUSTOMER_TRIP_STATUS_CHIP_SELECTED_CLASS,
  CUSTOMER_TRIP_STATUS_LABELS,
  getCustomerTripStatus,
  type CustomerTripStatus,
} from '../customerTripStatus';
import type { CustomerMinTeamsFilter } from '../customerTeamFilter';
import { buildCustomerPaginationItems, CUSTOMER_PAGINATION_SHORTCUT_HELP } from '../customerPagination';
import { getColorByDestination } from '../../guide/trip-color';
import { getCustomerTravelSummary } from '../customerTravelSummary';
import { UserDisplayName } from './UserDisplayName';
import type { UserRow } from '../hooks';

type StatusFilterKey = CustomerTripStatus | 'all';

const STATUS_FILTER_KEYS: StatusFilterKey[] = ['all', 'pre', 'confirmed', 'ongoing', 'done'];

const MIN_TEAMS_FILTER_OPTIONS: Array<{ value: CustomerMinTeamsFilter; label: string }> = [
  { value: 2, label: '2팀 이상' },
  { value: 3, label: '3팀 이상' },
];

interface CustomerSelectorProps {
  users: UserRow[];
  selectedUserId?: string;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  onSelect: (userId: string) => void;
  statusFilter?: StatusFilterKey;
  onChangeStatusFilter?: (value: StatusFilterKey) => void;
  groupCounts?: Record<StatusFilterKey, number>;
  minTeamsFilter?: CustomerMinTeamsFilter | null;
  onChangeMinTeamsFilter?: (value: CustomerMinTeamsFilter | null) => void;
  minTeamCounts?: Record<CustomerMinTeamsFilter, number>;
  hideStatusFilter?: boolean;
  showTravelSummary?: boolean;
  isRestoringList?: boolean;
  currentPage?: number;
  totalPages?: number;
  onChangePage?: (page: number) => void;
}

export function CustomerSelector({
  users,
  selectedUserId,
  searchValue,
  onChangeSearch,
  onSelect,
  statusFilter,
  onChangeStatusFilter,
  groupCounts,
  minTeamsFilter = null,
  onChangeMinTeamsFilter,
  minTeamCounts,
  hideStatusFilter = false,
  showTravelSummary = false,
  isRestoringList = false,
  currentPage,
  totalPages,
  onChangePage,
}: CustomerSelectorProps): JSX.Element {
  const paginationItems =
    currentPage != null && totalPages != null && totalPages > 1
      ? buildCustomerPaginationItems(currentPage, totalPages)
      : [];
  const canGoPrevious = currentPage != null && currentPage > 1;
  const canGoNext = currentPage != null && totalPages != null && currentPage < totalPages;
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center">
        <h2 className="shrink-0 text-sm font-semibold text-slate-900">고객</h2>
        <div className="relative ml-auto w-1/2">
          <Input
            value={searchValue}
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="이름·담당자·문서번호"
            className="h-8 pr-7 text-xs"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-xs leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {!hideStatusFilter && statusFilter && onChangeStatusFilter && groupCounts ? (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTER_KEYS.map((key) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeStatusFilter(key)}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {CUSTOMER_TRIP_STATUS_LABELS[key]}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {groupCounts[key]}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {onChangeMinTeamsFilter && minTeamCounts ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {MIN_TEAMS_FILTER_OPTIONS.map(({ value, label }) => {
            const isActive = minTeamsFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChangeMinTeamsFilter(isActive ? null : value)}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {minTeamCounts[value]}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {onChangePage && totalPages != null && totalPages > 1 && currentPage != null ? (
        <nav
          aria-label="고객 목록 페이지"
          className="mt-2 flex items-center border-t border-slate-100 pt-2"
        >
          <div className="flex flex-1 items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onChangePage(currentPage - 1)}
              disabled={!canGoPrevious}
              aria-label="이전 페이지 (Q)"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">Q</span>
              <span aria-hidden="true">&lt;</span>
            </button>

            {paginationItems.map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-1 text-xs text-slate-400" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onChangePage(item)}
                  aria-current={item === currentPage ? 'page' : undefined}
                  aria-label={`${item}페이지`}
                  className={`min-w-7 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    item === currentPage
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onChangePage(currentPage + 1)}
              disabled={!canGoNext}
              aria-label="다음 페이지 (E)"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">&gt;</span>
              <span aria-hidden="true">E</span>
            </button>
          </div>

          <TooltipHelpIcon
            content={CUSTOMER_PAGINATION_SHORTCUT_HELP}
            align="right"
            placement="above"
            ariaLabel="페이지 이동 단축키 안내"
          />
        </nav>
      ) : null}

      <div className="mt-3 grid gap-2">
        {users.map((user) => {
          const isSelected = selectedUserId === user.id;
          const tripStatus = getCustomerTripStatus(user);
          const chipClass = isSelected
            ? CUSTOMER_TRIP_STATUS_CHIP_SELECTED_CLASS[tripStatus]
            : CUSTOMER_TRIP_STATUS_CHIP_CLASS[tripStatus];
          const travelSummary = showTravelSummary ? getCustomerTravelSummary(user) : null;
          const destinationColor = travelSummary ? getColorByDestination(travelSummary.destination) : null;
          const secondaryTextClass = isSelected ? 'text-slate-200' : 'text-slate-500';
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="grid gap-0.5">
                  <UserDisplayName
                    user={user}
                    className="font-medium"
                    badgeClassName={
                      isSelected
                        ? 'rounded-full border border-white/20 bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white'
                        : undefined
                    }
                  />
                  {travelSummary ? (
                    <>
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? destinationColor?.textSelected : destinationColor?.text
                        }`}
                      >
                        {travelSummary.destination}
                      </span>
                      <span className={`text-xs ${secondaryTextClass}`}>{travelSummary.travelPeriod}</span>
                    </>
                  ) : (
                    <span className={`text-xs ${secondaryTextClass}`}>
                      담당자: {user.ownerEmployee?.name ?? '미지정'}
                    </span>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chipClass}`}>
                  {CUSTOMER_TRIP_STATUS_LABELS[tripStatus]}
                </span>
              </div>
            </button>
          );
        })}
        {users.length === 0 ? (
          isRestoringList ? null : <p className="text-xs text-slate-500">검색 결과가 없습니다.</p>
        ) : null}
      </div>
    </Card>
  );
}
