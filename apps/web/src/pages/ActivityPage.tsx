import type { Activity } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useActivityCrud } from '../features/activity/hooks';
import { z } from 'zod';

const schema = z.object({
  timeBlockId: z.string().min(1),
  description: z.string().min(1),
  orderIndex: z.number().int().min(0),
  isOptional: z.string(),
  conditionNote: z.string(),
});

export function ActivityPage(): JSX.Element {
  const crud = useActivityCrud();

  return (
    <CrudScreen<Activity, typeof schema>
      title="활동"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'timeBlockId', label: '시간 블록 ID' },
        { name: 'description', label: '설명' },
        { name: 'orderIndex', label: '순서', type: 'number' },
        { name: 'isOptional', label: '선택 활동 여부 (true/false)' },
        { name: 'conditionNote', label: '조건 메모' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'timeBlockId', label: '시간 블록 ID' },
        { key: 'description', label: '설명' },
      ]}
      createDefaultValues={{ timeBlockId: '', description: '', orderIndex: 0, isOptional: 'false', conditionNote: '' }}
      toUpdateValues={(row) => ({
        timeBlockId: row.timeBlockId,
        description: row.description,
        orderIndex: row.orderIndex,
        isOptional: String(row.isOptional),
        conditionNote: row.conditionNote ?? '',
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
