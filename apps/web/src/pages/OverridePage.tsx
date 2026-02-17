import type { Override } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useOverrideCrud } from '../features/override/hooks';
import { z } from 'zod';

const schema = z.object({
  planId: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1),
  fieldName: z.string().min(1),
  value: z.string().min(1),
});

export function OverridePage(): JSX.Element {
  const crud = useOverrideCrud();

  return (
    <CrudScreen<Override, typeof schema>
      title="Override"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'planId', label: 'Plan ID' },
        { name: 'targetType', label: 'Target Type' },
        { name: 'targetId', label: 'Target ID' },
        { name: 'fieldName', label: 'Field Name' },
        { name: 'value', label: 'Value' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'planId', label: 'Plan ID' },
        { key: 'fieldName', label: 'Field' },
      ]}
      createDefaultValues={{ planId: '', targetType: 'DayPlan', targetId: '', fieldName: '', value: '' }}
      toUpdateValues={(row) => ({
        planId: row.planId,
        targetType: row.targetType,
        targetId: row.targetId,
        fieldName: row.fieldName,
        value: row.value,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
