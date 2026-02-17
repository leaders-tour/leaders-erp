import { Card } from '@tour/ui';
import { useMemo, useState } from 'react';
import type { z } from 'zod';
import { SimpleTable, type TableColumn } from '../data-table/SimpleTable';
import { SimpleForm, type FormFieldConfig } from '../form/SimpleForm';

interface CrudScreenProps<TItem extends { id: string }, TSchema extends z.ZodTypeAny> {
  title: string;
  rows: TItem[];
  loading: boolean;
  columns: TableColumn<TItem>[];
  schema: TSchema;
  fields: FormFieldConfig<TSchema>[];
  createDefaultValues: z.infer<TSchema>;
  toUpdateValues: (row: TItem) => z.infer<TSchema>;
  onCreate: (input: z.infer<TSchema>) => Promise<void>;
  onUpdate: (id: string, input: z.infer<TSchema>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CrudScreen<TItem extends { id: string }, TSchema extends z.ZodTypeAny>({
  title,
  rows,
  loading,
  columns,
  schema,
  fields,
  createDefaultValues,
  toUpdateValues,
  onCreate,
  onUpdate,
  onDelete,
}: CrudScreenProps<TItem, TSchema>): JSX.Element {
  const [editing, setEditing] = useState<TItem | null>(null);

  const defaults = useMemo(() => {
    if (!editing) {
      return createDefaultValues;
    }
    return toUpdateValues(editing);
  }, [createDefaultValues, editing, toUpdateValues]);

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <SimpleForm
        title={editing ? `${title} 수정` : `${title} 생성`}
        schema={schema}
        fields={fields}
        defaultValues={defaults}
        submitLabel={editing ? '수정 저장' : '신규 생성'}
        onSubmit={async (value) => {
          if (editing) {
            await onUpdate(editing.id, value);
            setEditing(null);
            return;
          }
          await onCreate(value);
        }}
      />
      <Card>{loading ? <p>로딩 중...</p> : null}</Card>
      <SimpleTable title={`${title} 목록`} columns={columns} rows={rows} onEdit={setEditing} onDelete={onDelete} />
    </section>
  );
}
