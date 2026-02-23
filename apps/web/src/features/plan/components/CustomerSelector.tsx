import { Card } from '@tour/ui';
import type { UserRow } from '../hooks';

interface CustomerSelectorProps {
  users: UserRow[];
  selectedUserId?: string;
  onSelect: (userId: string) => void;
}

export function CustomerSelector({ users, selectedUserId, onSelect }: CustomerSelectorProps): JSX.Element {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">고객</h2>
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
            {user.name}
          </button>
        ))}
      </div>
    </Card>
  );
}
