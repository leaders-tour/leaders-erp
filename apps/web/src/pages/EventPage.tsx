import { CrudScreen } from '../components/layout/CrudScreen';
import { useEventCrud } from '../features/event/hooks';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean(),
  securityDepositKrw: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().min(0),
});

type EventFormValues = z.infer<typeof schema>;

type EventRow = {
  id: string;
  code: string;
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
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'code', label: '코드' },
        { name: 'name', label: '이름' },
        { name: 'isActive', label: '진행중', type: 'checkbox' },
        { name: 'securityDepositKrw', label: '보증금(원)', type: 'number' },
        { name: 'sortOrder', label: '정렬순서', type: 'number' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'code', label: '코드' },
        { key: 'name', label: '이름' },
        { key: 'isActive', label: '진행중' },
        { key: 'securityDepositKrw', label: '보증금(원)' },
      ]}
      createDefaultValues={{ code: '', name: '', isActive: true, securityDepositKrw: 0, sortOrder: 0 }}
      toUpdateValues={(row): EventFormValues => ({
        code: row.code,
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
