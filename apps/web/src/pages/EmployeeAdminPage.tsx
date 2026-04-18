import { EmployeeRole } from '@tour/domain';
import { Button, Card, Input } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  useCreateEmployee,
  useDeactivateEmployee,
  useEmployees,
  useResetEmployeePassword,
  useUpdateEmployee,
  type EmployeeRow,
} from '../features/auth/hooks';

interface EmployeeDraftMap {
  [employeeId: string]: {
    name: string;
    email: string;
    role: EmployeeRole;
    isActive: boolean;
    password: string;
  };
}

interface FieldLabelProps {
  children: string;
}

function FieldLabel({ children }: FieldLabelProps): JSX.Element {
  return <span className="mb-1.5 block text-xs font-medium text-slate-600">{children}</span>;
}

function roleLabel(role: EmployeeRole): string {
  if (role === EmployeeRole.ADMIN) return '관리자';
  if (role === EmployeeRole.OPS_STAFF) return '운영 담당';
  return '일반';
}

export function EmployeeAdminPage(): JSX.Element {
  const { employees, loading } = useEmployees(false);
  const { createEmployee, loading: creatingEmployee } = useCreateEmployee();
  const { updateEmployee, loading: updatingEmployee } = useUpdateEmployee();
  const { resetEmployeePassword, loading: resettingPassword } = useResetEmployeePassword();
  const { deactivateEmployee, loading: deactivatingEmployee } = useDeactivateEmployee();
  const [drafts, setDrafts] = useState<EmployeeDraftMap>({});
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: EmployeeRole.STAFF,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const employee of employees) {
        const existing = next[employee.id];
        next[employee.id] = {
          name: existing?.name ?? employee.name,
          email: existing?.email ?? employee.email,
          role: existing?.role ?? employee.role,
          isActive: existing?.isActive ?? employee.isActive,
          password: existing?.password ?? '',
        };
      }
      return next;
    });
  }, [employees]);

  const activeCount = useMemo(() => employees.filter((employee) => employee.isActive).length, [employees]);

  return (
    <section className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">직원 관리</h1>
          <p className="mt-1 text-sm text-slate-600">직원 계정 생성, 권한 변경, 비밀번호 재설정을 관리합니다.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          활성 직원 {activeCount}명
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">직원 생성</h2>
            <p className="text-sm text-slate-600">초기 비밀번호는 관리자만 알고 전달하는 방식입니다.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr_0.9fr_auto]">
          <label>
            <FieldLabel>이름</FieldLabel>
            <Input
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="직원 이름"
            />
          </label>
          <label>
            <FieldLabel>이메일 주소</FieldLabel>
            <Input
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="example@tour.com"
            />
          </label>
          <label>
            <FieldLabel>초기 비밀번호</FieldLabel>
            <Input
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="4자 이상 입력"
            />
          </label>
          <label>
            <FieldLabel>권한</FieldLabel>
            <select
              value={createForm.role}
              onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as EmployeeRole }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value={EmployeeRole.STAFF}>일반</option>
              <option value={EmployeeRole.OPS_STAFF}>운영 담당</option>
              <option value={EmployeeRole.ADMIN}>관리자</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button
              variant="primary"
              disabled={!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 4 || creatingEmployee}
              onClick={async () => {
                setErrorMessage(null);
                setFeedback(null);
                try {
                  await createEmployee({
                    name: createForm.name.trim(),
                    email: createForm.email.trim(),
                    password: createForm.password,
                    role: createForm.role,
                  });
                  setCreateForm({ name: '', email: '', password: '', role: EmployeeRole.STAFF });
                  setFeedback('직원 계정을 생성했습니다.');
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : '직원 생성에 실패했습니다.');
                }
              }}
            >
              {creatingEmployee ? '생성 중...' : '직원 생성'}
            </Button>
          </div>
        </div>
      </Card>

      {feedback ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</p> : null}
      {errorMessage ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}

      <div className="grid gap-4">
        {loading ? <p className="text-sm text-slate-600">직원 목록을 불러오는 중...</p> : null}

        {employees.map((employee: EmployeeRow) => {
          const draft = drafts[employee.id] ?? {
            name: employee.name,
            email: employee.email,
            role: employee.role,
            isActive: employee.isActive,
            password: '',
          };

          return (
            <Card key={employee.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1.2fr_0.8fr_0.9fr]">
                  <label>
                    <FieldLabel>이름</FieldLabel>
                    <Input
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [employee.id]: { ...draft, name: event.target.value },
                        }))
                      }
                      placeholder="직원 이름"
                    />
                  </label>
                  <label>
                    <FieldLabel>이메일 주소</FieldLabel>
                    <Input
                      type="email"
                      value={draft.email}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [employee.id]: { ...draft, email: event.target.value },
                        }))
                      }
                      placeholder="example@tour.com"
                    />
                  </label>
                  <label>
                    <FieldLabel>권한</FieldLabel>
                    <select
                      value={draft.role}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [employee.id]: { ...draft, role: event.target.value as EmployeeRole },
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value={EmployeeRole.STAFF}>일반</option>
                      <option value={EmployeeRole.OPS_STAFF}>운영 담당</option>
                      <option value={EmployeeRole.ADMIN}>관리자</option>
                    </select>
                  </label>
                  <label>
                    <FieldLabel>상태</FieldLabel>
                    <select
                      value={draft.isActive ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [employee.id]: { ...draft, isActive: event.target.value === 'ACTIVE' },
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="ACTIVE">활성</option>
                      <option value="INACTIVE">비활성</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-2 xl:min-w-[320px]">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={updatingEmployee}
                      onClick={async () => {
                        setErrorMessage(null);
                        setFeedback(null);
                        try {
                          await updateEmployee(employee.id, {
                            name: draft.name.trim(),
                            email: draft.email.trim(),
                            role: draft.role,
                            isActive: draft.isActive,
                          });
                          setFeedback(`${employee.name} 계정을 저장했습니다.`);
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : '직원 저장에 실패했습니다.');
                        }
                      }}
                    >
                      저장
                    </Button>

                    <Button
                      variant="destructive"
                      disabled={!employee.isActive || deactivatingEmployee}
                      onClick={async () => {
                        setErrorMessage(null);
                        setFeedback(null);
                        try {
                          await deactivateEmployee(employee.id);
                          setFeedback(`${employee.name} 계정을 비활성화했습니다.`);
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : '직원 비활성화에 실패했습니다.');
                        }
                      }}
                    >
                      비활성화
                    </Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <label>
                      <FieldLabel>새 비밀번호</FieldLabel>
                      <Input
                        type="password"
                        value={draft.password}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [employee.id]: { ...draft, password: event.target.value },
                          }))
                        }
                        placeholder="4자 이상 입력"
                      />
                    </label>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        disabled={draft.password.length < 4 || resettingPassword}
                        onClick={async () => {
                          setErrorMessage(null);
                          setFeedback(null);
                          try {
                            await resetEmployeePassword(employee.id, draft.password);
                            setDrafts((current) => ({
                              ...current,
                              [employee.id]: { ...draft, password: '' },
                            }));
                            setFeedback(`${employee.name} 비밀번호를 재설정했습니다.`);
                          } catch (error) {
                            setErrorMessage(error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다.');
                          }
                        }}
                      >
                        비밀번호 재설정
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    권한 {roleLabel(employee.role)} · 상태 {employee.isActive ? '활성' : '비활성'} · 계정 생성일 {new Date(employee.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
