import { Card, Input } from '@tour/ui';
import type { UserRow } from '../hooks';

interface CustomerSelectorProps {
  users: UserRow[];
  selectedUserId?: string;
  searchValue: string;
  onChangeSearch: (value: string) => void;
  onSelect: (userId: string) => void;
}

export function CustomerSelector({
  users,
  selectedUserId,
  searchValue,
  onChangeSearch,
  onSelect,
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
      <div className="mt-3 grid gap-2">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onSelect(user.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              selectedUserId === user.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="grid gap-1">
              <span className="font-medium">{user.name}</span>
              <span className={`text-xs ${selectedUserId === user.id ? 'text-slate-200' : 'text-slate-500'}`}>
                담당자: {user.ownerEmployee?.name ?? '미지정'}
              </span>
            </div>
          </button>
        ))}
        {users.length === 0 ? <p className="text-xs text-slate-500">검색 결과가 없습니다.</p> : null}
      </div>
    </Card>
  );
}
