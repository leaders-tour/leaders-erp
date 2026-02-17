import { VariantType, type Plan } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { usePlanCrud } from '../features/plan/hooks';
import { z } from 'zod';

const schema = z.object({
  regionId: z.string().min(1),
  variantType: z.nativeEnum(VariantType),
  totalDays: z.number().int().min(2).max(10),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
});

export function PlanPage(): JSX.Element {
  const crud = usePlanCrud();

  return (
    <CrudScreen<Plan, typeof schema>
      title="Plan"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'regionId', label: 'Region ID' },
        { name: 'variantType', label: 'Variant Type (basic/early/afternoon/extend)' },
        { name: 'totalDays', label: 'Total Days', type: 'number' },
        { name: 'fromLocationId', label: 'From Location ID' },
        { name: 'toLocationId', label: 'To Location ID' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'regionId', label: 'Region ID' },
        { key: 'variantType', label: 'Variant' },
        { key: 'totalDays', label: 'Days' },
      ]}
      createDefaultValues={{
        regionId: '',
        variantType: VariantType.Basic,
        totalDays: 2,
        fromLocationId: '',
        toLocationId: '',
      }}
      toUpdateValues={(row) => ({
        regionId: row.regionId,
        variantType: row.variantType,
        totalDays: row.totalDays,
        fromLocationId: '',
        toLocationId: '',
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
