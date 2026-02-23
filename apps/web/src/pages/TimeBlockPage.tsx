import type { TimeBlock } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useTimeBlockCrud } from '../features/time-block/hooks';
import { z } from 'zod';

const schema = z.object({
  locationId: z.string().optional(),
  locationVersionId: z.string().min(1),
  startTime: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/),
  label: z.string().min(1),
  orderIndex: z.number().int().min(0),
});

type TimeBlockRow = TimeBlock & {
  locationVersionId?: string | null;
};

export function TimeBlockPage(): JSX.Element {
  const crud = useTimeBlockCrud();

  return (
    <CrudScreen<TimeBlockRow, typeof schema>
      title="시간 블록"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'locationVersionId', label: '목적지 버전 ID' },
        { name: 'locationId', label: '목적지 ID(옵션)' },
        { name: 'startTime', label: '시작 시간' },
        { name: 'label', label: '라벨' },
        { name: 'orderIndex', label: '순서', type: 'number' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'locationVersionId', label: '목적지 버전 ID' },
        { key: 'locationId', label: '목적지 ID' },
        { key: 'startTime', label: '시작 시간' },
      ]}
      createDefaultValues={{ locationId: '', locationVersionId: '', startTime: '08:00', label: '', orderIndex: 0 }}
      toUpdateValues={(row) => ({
        locationId: row.locationId,
        locationVersionId: row.locationVersionId ?? '',
        startTime: row.startTime,
        label: row.label,
        orderIndex: row.orderIndex,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
