import { CrudScreen } from '../components/layout/CrudScreen';
import { useRegionLodgingCrud } from '../features/lodging-selection/hooks';
import { z } from 'zod';

const schema = z
  .object({
    regionId: z.string().min(1),
    name: z.string().min(1),
    priceKrw: z.number().int().min(0).nullable().optional(),
    pricePerPersonKrw: z.number().int().min(0).nullable().optional(),
    pricePerTeamKrw: z.number().int().min(0).nullable().optional(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0),
  })
  .superRefine((value, ctx) => {
    if (value.pricePerPersonKrw != null && value.pricePerTeamKrw != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '인당 가격과 팀당 가격은 동시에 입력할 수 없습니다.',
        path: ['pricePerPersonKrw'],
      });
    }

    if (value.priceKrw == null && value.pricePerPersonKrw == null && value.pricePerTeamKrw == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '가격 또는 인당 가격 또는 팀당 가격 중 하나는 필요합니다.',
        path: ['priceKrw'],
      });
    }
  });

type RegionLodgingRow = {
  id: string;
  regionId: string;
  name: string;
  priceKrw?: number | null;
  pricePerPersonKrw?: number | null;
  pricePerTeamKrw?: number | null;
  isActive: boolean;
  sortOrder: number;
  region?: {
    id: string;
    name: string;
  } | null;
};

export function RegionLodgingPage(): JSX.Element {
  const crud = useRegionLodgingCrud();

  return (
    <CrudScreen<RegionLodgingRow, typeof schema>
      title="지역 숙소"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'regionId', label: '지역 ID' },
        { name: 'name', label: '숙소명' },
        { name: 'priceKrw', label: '가격', type: 'number', helpText: '인당/팀당이 비어 있을 때만 사용됩니다.' },
        { name: 'pricePerPersonKrw', label: '인당 가격', type: 'number' },
        { name: 'pricePerTeamKrw', label: '팀당 가격', type: 'number' },
        { name: 'sortOrder', label: '정렬순서', type: 'number' },
        { name: 'isActive', label: '노출 여부', type: 'boolean-toggle' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'regionId', label: '지역 ID' },
        { key: 'name', label: '숙소명' },
        { key: 'priceKrw', label: '가격' },
        { key: 'pricePerPersonKrw', label: '인당 가격' },
        { key: 'pricePerTeamKrw', label: '팀당 가격' },
      ]}
      createDefaultValues={{
        regionId: '',
        name: '',
        priceKrw: undefined,
        pricePerPersonKrw: undefined,
        pricePerTeamKrw: undefined,
        isActive: true,
        sortOrder: 0,
      }}
      toUpdateValues={(row) => ({
        regionId: row.regionId,
        name: row.name,
        priceKrw: row.priceKrw ?? undefined,
        pricePerPersonKrw: row.pricePerPersonKrw ?? undefined,
        pricePerTeamKrw: row.pricePerTeamKrw ?? undefined,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
