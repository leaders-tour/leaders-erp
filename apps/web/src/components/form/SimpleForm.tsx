import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, FormField, Input, Textarea, type ButtonProps } from '@tour/ui';
import { useEffect, useMemo } from 'react';
import { useForm, type Path } from 'react-hook-form';
import type { z } from 'zod';

export interface FormFieldConfig<TSchema extends z.ZodTypeAny> {
  name: keyof z.infer<TSchema> & string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'checkbox' | 'boolean-toggle';
  helpText?: string;
}

interface SimpleFormProps<TSchema extends z.ZodTypeAny> {
  title: string;
  schema: TSchema;
  fields: FormFieldConfig<TSchema>[];
  defaultValues: z.infer<TSchema>;
  onSubmit: (value: z.infer<TSchema>) => Promise<void>;
  submitLabel: string;
  submitVariant?: ButtonProps['variant'];
}

export function SimpleForm<TSchema extends z.ZodTypeAny>({
  title,
  schema,
  fields,
  defaultValues,
  onSubmit,
  submitLabel,
  submitVariant,
}: SimpleFormProps<TSchema>): JSX.Element {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const defaultValuesKey = useMemo(() => JSON.stringify(defaultValues), [defaultValues]);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValuesKey, form]);

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={form.handleSubmit(async (value) => {
          await onSubmit(value);
          form.reset(defaultValues);
        })}
      >
        {fields.map((field) => (
          <div key={field.name}>
            <FormField label={field.label}>
              {field.type === 'textarea' ? (
                <Textarea className="min-h-32" rows={6} {...form.register(field.name as Path<z.infer<TSchema>>)} />
              ) : field.type === 'checkbox' ? (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    {...form.register(field.name as Path<z.infer<TSchema>>)}
                  />
                  <span>사용</span>
                </label>
              ) : field.type === 'boolean-toggle' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue(field.name as Path<z.infer<TSchema>>, true as z.infer<TSchema>[Path<z.infer<TSchema>>])}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
                      form.watch(field.name as Path<z.infer<TSchema>>)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ON
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue(field.name as Path<z.infer<TSchema>>, false as z.infer<TSchema>[Path<z.infer<TSchema>>])}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
                      !form.watch(field.name as Path<z.infer<TSchema>>)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    OFF
                  </button>
                </div>
              ) : (
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
              )}
            </FormField>
            {field.helpText ? <p className="mt-1 text-xs text-slate-500">{field.helpText}</p> : null}
            {form.formState.errors[field.name as Path<z.infer<TSchema>>] ? (
              <p className="mt-1 text-xs text-rose-600">입력값을 확인해 주세요.</p>
            ) : null}
          </div>
        ))}
        <div className="md:col-span-2">
          <Button type="submit" variant={submitVariant}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
