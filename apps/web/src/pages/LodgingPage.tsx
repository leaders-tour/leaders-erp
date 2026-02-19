import type { Lodging } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useLodgingCrud } from '../features/lodging/hooks';
import { z } from 'zod';

const schema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1),
  specialNotes: z.string().optional(),
});

export function LodgingPage(): JSX.Element {
  const crud = useLodgingCrud();

  return (
    <CrudScreen<Lodging, typeof schema>
      title="숙소"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'locationId', label: 'Location ID' },
        { name: 'name', label: '숙소명' },
        { name: 'specialNotes', label: '특이사항' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'locationNameSnapshot', label: '목적지' },
        { key: 'name', label: '숙소명' },
      ]}
      createDefaultValues={{ locationId: '', name: '', specialNotes: '' }}
      toUpdateValues={(row) => ({
        locationId: row.locationId,
        name: row.name,
        specialNotes: row.specialNotes ?? '',
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
