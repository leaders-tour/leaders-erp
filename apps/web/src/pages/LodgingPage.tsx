import type { Lodging } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useLodgingCrud } from '../features/lodging/hooks';
import { z } from 'zod';

const schema = z.object({
  locationId: z.string().optional(),
  locationVersionId: z.string().min(1),
  name: z.string().min(1),
  specialNotes: z.string().optional(),
});

type LodgingRow = Lodging & {
  locationVersionId?: string | null;
};

export function LodgingPage(): JSX.Element {
  const crud = useLodgingCrud();

  return (
    <CrudScreen<LodgingRow, typeof schema>
      title="숙소"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'locationVersionId', label: '목적지 버전 ID' },
        { name: 'locationId', label: '목적지 ID(옵션)' },
        { name: 'name', label: '숙소명' },
        { name: 'specialNotes', label: '특이사항' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'locationNameSnapshot', label: '목적지' },
        { key: 'name', label: '숙소명' },
      ]}
      createDefaultValues={{ locationId: '', locationVersionId: '', name: '', specialNotes: '' }}
      toUpdateValues={(row) => ({
        locationId: row.locationId,
        locationVersionId: row.locationVersionId ?? '',
        name: row.name,
        specialNotes: row.specialNotes ?? '',
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
