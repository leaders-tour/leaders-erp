import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, FormField, Input } from '@tour/ui';
import { useForm, type Path } from 'react-hook-form';
import type { z } from 'zod';

export interface FormFieldConfig<TSchema extends z.ZodTypeAny> {
  name: keyof z.infer<TSchema> & string;
  label: string;
  type?: 'text' | 'number';
}

interface SimpleFormProps<TSchema extends z.ZodTypeAny> {
  title: string;
  schema: TSchema;
  fields: FormFieldConfig<TSchema>[];
  defaultValues: z.infer<TSchema>;
  onSubmit: (value: z.infer<TSchema>) => Promise<void>;
  submitLabel: string;
}

export function SimpleForm<TSchema extends z.ZodTypeAny>({
  title,
  schema,
  fields,
  defaultValues,
  onSubmit,
  submitLabel,
}: SimpleFormProps<TSchema>): JSX.Element {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <form
        className="grid gap-3"
        onSubmit={form.handleSubmit(async (value) => {
          await onSubmit(value);
          form.reset(defaultValues);
        })}
      >
        {fields.map((field) => (
          <FormField key={field.name} label={field.label}>
            <Input
              type={field.type ?? 'text'}
              {...form.register(field.name as Path<z.infer<TSchema>>, {
                setValueAs:
                  field.type === 'number'
                    ? (input: string) => {
                        const parsed = Number(input);
                        return Number.isNaN(parsed) ? undefined : parsed;
                      }
                    : undefined,
              })}
            />
          </FormField>
        ))}
        <Button type="submit">{submitLabel}</Button>
      </form>
    </Card>
  );
}
