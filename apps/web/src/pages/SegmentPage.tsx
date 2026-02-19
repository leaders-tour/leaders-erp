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
      title="이동경로"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'regionId', label: '지역 ID' },
        { name: 'fromLocationId', label: '출발 목적지 ID' },
        { name: 'toLocationId', label: '도착 목적지 ID' },
        { name: 'averageDistanceKm', label: '평균 거리(km)', type: 'number' },
        { name: 'averageTravelHours', label: '평균 이동 시간(시간)', type: 'number' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'regionName', label: '지역' },
        { key: 'fromLocationId', label: '출발지' },
        { key: 'toLocationId', label: '도착지' },
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
