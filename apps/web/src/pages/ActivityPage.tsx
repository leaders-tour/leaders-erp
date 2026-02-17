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
      title="Activity"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'timeBlockId', label: 'TimeBlock ID' },
        { name: 'description', label: 'Description' },
        { name: 'orderIndex', label: 'Order Index', type: 'number' },
        { name: 'isOptional', label: 'Is Optional (true/false)' },
        { name: 'conditionNote', label: 'Condition Note' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'timeBlockId', label: 'TimeBlock ID' },
        { key: 'description', label: 'Description' },
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
