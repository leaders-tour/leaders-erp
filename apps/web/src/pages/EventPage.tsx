import { Button, Card, SectionHeader } from '@tour/ui';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { SimpleTable, type TableColumn } from '../components/data-table/SimpleTable';
import { SimpleForm, type FormFieldConfig } from '../components/form/SimpleForm';
import { useEventCrud, type EventFormInput, type EventRow } from '../features/event/hooks';

const schema = z.object({
  name: z.string().min(1),
  isActive: z.boolean(),
  securityDepositKrw: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().min(0),
});

const fields: FormFieldConfig<typeof schema>[] = [
  { name: 'name', label: '이름', helpText: '이벤트에 표시될 이름입니다.' },
  { name: 'isActive', label: '진행중', type: 'boolean-toggle', helpText: 'ON은 오픈, OFF는 오프 상태입니다.' },
  { name: 'securityDepositKrw', label: '보증금(원)', type: 'number', helpText: '이 이벤트의 보증금 금액(원)입니다.' },
  { name: 'sortOrder', label: '정렬순서', type: 'number', helpText: '숫자가 작을수록 먼저 노출됩니다.' },
];

const columns: TableColumn<EventRow>[] = [
  { key: 'name', label: '이름' },
  {
    key: 'isActive',
    label: '진행상태',
    render: (row) => (
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden />
        <span>{row.isActive ? '오픈' : '오프'}</span>
      </span>
    ),
  },
  {
    key: 'securityDepositKrw',
    label: '보증금(원)',
    render: (row) => row.securityDepositKrw.toLocaleString('ko-KR'),
  },
];

const headerNote = (
  <div className="inline-flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
      오픈
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden />
      오프
    </span>
  </div>
);

const defaultValues: EventFormInput = {
  name: '',
  isActive: true,
  securityDepositKrw: 0,
  sortOrder: 0,
};

export function EventPage(): JSX.Element {
  const crud = useEventCrud();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreatePage = location.pathname === '/events/create';
  const [editing, setEditing] = useState<EventRow | null>(null);

  const editDefaultValues = useMemo<EventFormInput>(
    () =>
      editing
        ? {
            name: editing.name,
            isActive: editing.isActive,
            securityDepositKrw: editing.securityDepositKrw,
            sortOrder: editing.sortOrder,
          }
        : defaultValues,
    [editing],
  );

  return (
    <section className="grid gap-6">
      <SectionHeader
        title={isCreatePage ? '이벤트 생성' : '이벤트 목록'}
        description={isCreatePage ? '새 이벤트를 등록합니다.' : '등록된 이벤트를 확인하고 수정합니다.'}
        action={
          isCreatePage ? (
            <Button variant="outline" onClick={() => navigate('/events/list')}>
              이벤트 목록
            </Button>
          ) : (
            <Button variant="primary" onClick={() => navigate('/events/create')}>
              이벤트 생성
            </Button>
          )
        }
      />

      {headerNote}

      {isCreatePage ? (
        <SimpleForm
          title="이벤트 생성"
          schema={schema}
          fields={fields}
          defaultValues={defaultValues}
          submitLabel="이벤트 생성"
          submitVariant="primary"
          onSubmit={async (value) => {
            await crud.createRow(value);
            navigate('/events/list');
          }}
        />
      ) : null}

      {!isCreatePage && crud.loading ? (
        <Card className="rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm text-slate-600">데이터 로딩 중...</Card>
      ) : null}

      {!isCreatePage ? (
        <SimpleTable
          title="이벤트 목록"
          columns={columns}
          rows={crud.rows}
          allowDelete={false}
          onDelete={crud.deleteRow}
          onEdit={(row) => setEditing(row)}
        />
      ) : null}

      {!isCreatePage && editing ? (
        <div className="grid gap-3">
          <SimpleForm
            title={`이벤트 수정: ${editing.name}`}
            schema={schema}
            fields={fields}
            defaultValues={editDefaultValues}
            submitLabel="수정 저장"
            submitVariant="default"
            onSubmit={async (value) => {
              await crud.updateRow(editing.id, value);
              setEditing(null);
            }}
          />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setEditing(null)}>
              수정 닫기
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
