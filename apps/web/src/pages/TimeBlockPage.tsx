import type { TimeBlock } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useTimeBlockCrud } from '../features/time-block/hooks';
import { z } from 'zod';

const schema = z.object({
  dayPlanId: z.string().min(1),
  startTime: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/),
  label: z.string().min(1),
  orderIndex: z.number().int().min(0),
});

export function TimeBlockPage(): JSX.Element {
  const crud = useTimeBlockCrud();

  return (
    <CrudScreen<TimeBlock, typeof schema>
      title="TimeBlock"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'dayPlanId', label: 'DayPlan ID' },
        { name: 'startTime', label: 'Start Time' },
        { name: 'label', label: 'Label' },
        { name: 'orderIndex', label: 'Order Index', type: 'number' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'dayPlanId', label: 'DayPlan ID' },
        { key: 'startTime', label: 'Start Time' },
      ]}
      createDefaultValues={{ dayPlanId: '', startTime: '08:00', label: '', orderIndex: 0 }}
      toUpdateValues={(row) => ({
        dayPlanId: row.dayPlanId,
        startTime: row.startTime,
        label: row.label,
        orderIndex: row.orderIndex,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
