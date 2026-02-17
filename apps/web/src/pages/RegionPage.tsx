import type { Region } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useRegionCrud } from '../features/region/hooks';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
});

export function RegionPage(): JSX.Element {
  const crud = useRegionCrud();

  return (
    <CrudScreen<Region, typeof schema>
      title="Region"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'name', label: 'Name' },
        { name: 'description', label: 'Description' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ]}
      createDefaultValues={{ name: '', description: '' }}
      toUpdateValues={(row) => ({ name: row.name, description: row.description ?? '' })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
