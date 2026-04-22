import { Card, Input } from '@tour/ui';
import {
  CUSTOMER_TRIP_STATUS_CHIP_CLASS,
  CUSTOMER_TRIP_STATUS_CHIP_SELECTED_CLASS,
  CUSTOMER_TRIP_STATUS_LABELS,
  getCustomerTripStatus,
  type CustomerTripStatus,
} from '../customerTripStatus';
import type { UserRow } from '../hooks';

type StatusFilterKey = CustomerTripStatus | 'all';

const STATUS_FILTER_KEYS: StatusFilterKey[] = ['all', 'pre', 'confirmed', 'ongoing', 'done'];

interface CustomerSelectorProps {
  users: UserRow[];
  selectedUserId?: string;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  onSelect: (userId: string) => void;
  statusFilter: StatusFilterKey;
  onChangeStatusFilter: (value: StatusFilterKey) => void;
  groupCounts: Record<StatusFilterKey, number>;
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
}: CustomerSelectorProps): JSX.Element {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center">
        <h2 className="shrink-0 text-sm font-semibold text-slate-900">고객</h2>
        <Input
          value={searchValue}
          onChange={(event) => onChangeSearch(event.target.value)}
          placeholder="고객 검색"
          className="ml-auto h-8 w-1/2 text-xs"
        />
      </div>

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

      <div className="mt-3 grid gap-2">
        {users.map((user) => {
          const isSelected = selectedUserId === user.id;
          const tripStatus = getCustomerTripStatus(user);
          const chipClass = isSelected
            ? CUSTOMER_TRIP_STATUS_CHIP_SELECTED_CLASS[tripStatus]
            : CUSTOMER_TRIP_STATUS_CHIP_CLASS[tripStatus];
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
                  <span className="font-medium">{user.name}</span>
                  <span className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                    담당자: {user.ownerEmployee?.name ?? '미지정'}
                  </span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chipClass}`}>
                  {CUSTOMER_TRIP_STATUS_LABELS[tripStatus]}
                </span>
              </div>
            </button>
          );
        })}
        {users.length === 0 ? <p className="text-xs text-slate-500">검색 결과가 없습니다.</p> : null}
      </div>
    </Card>
  );
}
