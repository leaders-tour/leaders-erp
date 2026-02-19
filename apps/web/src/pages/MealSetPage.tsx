import type { MealSet } from '../generated/graphql';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useMealSetCrud } from '../features/meal-set/hooks';
import { z } from 'zod';

const schema = z.object({
  locationId: z.string().min(1),
  setName: z.string().min(1),
  breakfast: z.string().optional(),
  lunch: z.string().optional(),
  dinner: z.string().optional(),
});

export function MealSetPage(): JSX.Element {
  const crud = useMealSetCrud();

  return (
    <CrudScreen<MealSet, typeof schema>
      title="식사세트"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'locationId', label: 'Location ID' },
        { name: 'setName', label: '세트명' },
        { name: 'breakfast', label: '아침' },
        { name: 'lunch', label: '점심' },
        { name: 'dinner', label: '저녁' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'locationNameSnapshot', label: '목적지' },
        { key: 'setName', label: '세트명' },
      ]}
      createDefaultValues={{ locationId: '', setName: '', breakfast: '', lunch: '', dinner: '' }}
      toUpdateValues={(row) => ({
        locationId: row.locationId,
        setName: row.setName,
        breakfast: row.breakfast ?? '',
        lunch: row.lunch ?? '',
        dinner: row.dinner ?? '',
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
