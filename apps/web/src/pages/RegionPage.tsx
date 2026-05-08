import type { Region } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useRegionCrud } from '../features/region/hooks';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  alwaysIncludeFirstDayStart: z.boolean().default(false),
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
        {
          name: 'alwaysIncludeFirstDayStart',
          label: '1일차 시작 후보 항상 표시',
          type: 'boolean-toggle',
          helpText: '체크 시 해당 지역의 첫날 가능 목적지가 지역 세트 외여도 시작 후보에 표시됩니다.',
        },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: '지역명' },
        { key: 'description', label: '설명' },
        {
          key: 'alwaysIncludeFirstDayStart',
          label: '첫 시작',
          render: (row) => (row.alwaysIncludeFirstDayStart ? '항상' : '세트'),
        },
      ]}
      createDefaultValues={{ name: '', description: '', alwaysIncludeFirstDayStart: false }}
      toUpdateValues={(row) => ({
        name: row.name,
        description: row.description ?? '',
        alwaysIncludeFirstDayStart: row.alwaysIncludeFirstDayStart,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
