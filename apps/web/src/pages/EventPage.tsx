import { CrudScreen } from '../components/layout/CrudScreen';
import { useEventCrud } from '../features/event/hooks';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  isActive: z.boolean(),
  securityDepositKrw: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().min(0),
});

type EventFormValues = z.infer<typeof schema>;

type EventRow = {
  id: string;
  name: string;
  isActive: boolean;
  securityDepositKrw: number;
  sortOrder: number;
};

export function EventPage(): JSX.Element {
  const crud = useEventCrud();

  return (
    <CrudScreen<EventRow, typeof schema>
      title="이벤트"
      allowDelete={false}
      headerNote={
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
      }
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'name', label: '이름', helpText: '이벤트에 표시될 이름입니다.' },
        { name: 'isActive', label: '진행중', type: 'boolean-toggle', helpText: 'ON은 오픈, OFF는 오프 상태입니다.' },
        { name: 'securityDepositKrw', label: '보증금(원)', type: 'number', helpText: '이 이벤트의 보증금 금액(원)입니다.' },
        { name: 'sortOrder', label: '정렬순서', type: 'number', helpText: '숫자가 작을수록 먼저 노출됩니다.' },
      ]}
      columns={[
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
        { key: 'securityDepositKrw', label: '보증금(원)' },
      ]}
      createDefaultValues={{ name: '', isActive: true, securityDepositKrw: 0, sortOrder: 0 }}
      toUpdateValues={(row): EventFormValues => ({
        name: row.name,
        isActive: row.isActive,
        securityDepositKrw: row.securityDepositKrw,
        sortOrder: row.sortOrder,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
