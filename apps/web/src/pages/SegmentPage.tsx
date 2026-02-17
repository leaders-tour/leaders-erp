import type { Segment } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useSegmentCrud } from '../features/segment/hooks';
import { z } from 'zod';

const schema = z.object({
  regionId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  averageDistanceKm: z.number().positive(),
  averageTravelHours: z.number().positive(),
});

export function SegmentPage(): JSX.Element {
  const crud = useSegmentCrud();

  return (
    <CrudScreen<Segment, typeof schema>
      title="Segment"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'regionId', label: 'Region ID' },
        { name: 'fromLocationId', label: 'From Location ID' },
        { name: 'toLocationId', label: 'To Location ID' },
        { name: 'averageDistanceKm', label: 'Average Distance Km', type: 'number' },
        { name: 'averageTravelHours', label: 'Average Travel Hours', type: 'number' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'regionId', label: 'Region ID' },
        { key: 'fromLocationId', label: 'From' },
        { key: 'toLocationId', label: 'To' },
      ]}
      createDefaultValues={{
        regionId: '',
        fromLocationId: '',
        toLocationId: '',
        averageDistanceKm: 0,
        averageTravelHours: 0,
      }}
      toUpdateValues={(row) => ({
        regionId: row.regionId,
        fromLocationId: row.fromLocationId,
        toLocationId: row.toLocationId,
        averageDistanceKm: row.averageDistanceKm,
        averageTravelHours: row.averageTravelHours,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
