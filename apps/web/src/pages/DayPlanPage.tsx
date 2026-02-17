import type { DayPlan } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useDayPlanCrud } from '../features/day-plan/hooks';
import { z } from 'zod';

const schema = z.object({
  planId: z.string().min(1),
  dayIndex: z.number().int().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  distanceText: z.string().min(1),
  lodgingText: z.string().min(1),
  mealsText: z.string().min(1),
});

export function DayPlanPage(): JSX.Element {
  const crud = useDayPlanCrud();

  return (
    <CrudScreen<DayPlan, typeof schema>
      title="DayPlan"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'planId', label: 'Plan ID' },
        { name: 'dayIndex', label: 'Day Index', type: 'number' },
        { name: 'fromLocationId', label: 'From Location ID' },
        { name: 'toLocationId', label: 'To Location ID' },
        { name: 'distanceText', label: 'Distance Text' },
        { name: 'lodgingText', label: 'Lodging Text' },
        { name: 'mealsText', label: 'Meals Text' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'planId', label: 'Plan ID' },
        { key: 'dayIndex', label: 'Day' },
      ]}
      createDefaultValues={{
        planId: '',
        dayIndex: 1,
        fromLocationId: '',
        toLocationId: '',
        distanceText: '',
        lodgingText: '',
        mealsText: '',
      }}
      toUpdateValues={(row) => ({
        planId: row.planId,
        dayIndex: row.dayIndex,
        fromLocationId: row.fromLocationId,
        toLocationId: row.toLocationId,
        distanceText: row.distanceText,
        lodgingText: row.lodgingText,
        mealsText: row.mealsText,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
