import type { Location } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useLocationCrud } from '../features/location/hooks';
import { z } from 'zod';

const schema = z.object({
  regionId: z.string().min(1),
  name: z.string().min(1),
  defaultLodgingType: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export function LocationPage(): JSX.Element {
  const crud = useLocationCrud();

  return (
    <CrudScreen<Location, typeof schema>
      title="Location"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'regionId', label: 'Region ID' },
        { name: 'name', label: 'Name' },
        { name: 'defaultLodgingType', label: 'Default Lodging Type' },
        { name: 'latitude', label: 'Latitude', type: 'number' },
        { name: 'longitude', label: 'Longitude', type: 'number' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'regionId', label: 'Region ID' },
        { key: 'name', label: 'Name' },
      ]}
      createDefaultValues={{ regionId: '', name: '', defaultLodgingType: '', latitude: 0, longitude: 0 }}
      toUpdateValues={(row) => ({
        regionId: row.regionId,
        name: row.name,
        defaultLodgingType: row.defaultLodgingType,
        latitude: row.latitude ?? 0,
        longitude: row.longitude ?? 0,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
