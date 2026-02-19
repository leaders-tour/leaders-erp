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
      title="지역"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'name', label: '지역명' },
        { name: 'description', label: '설명' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: '지역명' },
        { key: 'description', label: '설명' },
      ]}
      createDefaultValues={{ name: '', description: '' }}
      toUpdateValues={(row) => ({ name: row.name, description: row.description ?? '' })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
