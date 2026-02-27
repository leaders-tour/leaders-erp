import { Button, Card, Input } from '@tour/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '../features/plan/hooks';

export function CustomerCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const { createUser, loading: creatingUser } = useCreateUser();
  const [newUserName, setNewUserName] = useState<string>('');

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">고객 생성</h1>
          <p className="mt-1 text-sm text-slate-600">새 고객을 등록합니다.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          고객 목록으로
        </Button>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2">
          <Input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="고객명 입력" />
          <div>
            <Button
              variant="primary"
              disabled={!newUserName.trim() || creatingUser}
              onClick={async () => {
                const created = await createUser(newUserName.trim());
                setNewUserName('');
                navigate(`/customers/${created.id}/plans`);
              }}
            >
              {creatingUser ? '생성 중...' : '고객 생성'}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
