import { Button, Card, Input } from '@tour/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context';
import { useEmployees } from '../features/auth/hooks';
import { useCreateUser } from '../features/plan/hooks';

interface FieldLabelProps {
  children: string;
}

function FieldLabel({ children }: FieldLabelProps): JSX.Element {
  return <span className="mb-1.5 block text-xs font-medium text-slate-600">{children}</span>;
}

export function CustomerCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const { createUser, loading: creatingUser } = useCreateUser();
  const { employee } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees(true);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [ownerEmployeeId, setOwnerEmployeeId] = useState<string>('');

  useEffect(() => {
    if (!ownerEmployeeId && employee?.id) {
      setOwnerEmployeeId(employee.id);
    }
  }, [employee?.id, ownerEmployeeId]);

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
          <label>
            <FieldLabel>고객명</FieldLabel>
            <Input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="고객 이름을 입력하세요" />
          </label>
          <label>
            <FieldLabel>이메일 주소</FieldLabel>
            <Input value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="이메일 주소를 입력하세요 (선택)" />
          </label>
          <label>
            <FieldLabel>담당 직원</FieldLabel>
            <select
              value={ownerEmployeeId}
              onChange={(event) => setOwnerEmployeeId(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">담당자 미지정</option>
              {employees.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.email})
                </option>
              ))}
            </select>
          </label>
          <div>
            <Button
              variant="primary"
              disabled={!newUserName.trim() || creatingUser}
              onClick={async () => {
                const created = await createUser({
                  name: newUserName.trim(),
                  email: newUserEmail.trim() || null,
                  ownerEmployeeId: ownerEmployeeId || null,
                });
                setNewUserName('');
                setNewUserEmail('');
                navigate(`/customers/${created.id}/plans`);
              }}
            >
              {creatingUser || employeesLoading ? '생성 중...' : '고객 생성'}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
