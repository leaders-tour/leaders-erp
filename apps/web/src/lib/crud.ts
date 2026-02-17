import { useMutation, useQuery, type DocumentNode } from '@apollo/client';

interface QueryResult<TItem> {
  rows: TItem[];
  loading: boolean;
  refetch: () => Promise<unknown>;
}

interface CrudDocuments {
  list: DocumentNode;
  create: DocumentNode;
  update: DocumentNode;
  remove: DocumentNode;
}

interface CrudKeys {
  listKey: string;
  createKey: string;
  updateKey: string;
  removeKey: string;
}

interface CrudOptions<TItem, TCreateInput, TUpdateInput> {
  docs: CrudDocuments;
  keys: CrudKeys;
  toCreateVariables: (input: TCreateInput) => Record<string, unknown>;
  toUpdateVariables: (id: string, input: TUpdateInput) => Record<string, unknown>;
}

export function useCrudResource<TItem extends { id: string }, TCreateInput, TUpdateInput>(
  options: CrudOptions<TItem, TCreateInput, TUpdateInput>,
): QueryResult<TItem> & {
  createRow: (input: TCreateInput) => Promise<void>;
  updateRow: (id: string, input: TUpdateInput) => Promise<void>;
  deleteRow: (id: string) => Promise<void>;
} {
  const { data, loading, refetch } = useQuery<Record<string, TItem[]>>(options.docs.list);

  const [createMutation] = useMutation<Record<string, TItem>>(options.docs.create);
  const [updateMutation] = useMutation<Record<string, TItem>>(options.docs.update);
  const [deleteMutation] = useMutation<Record<string, boolean>>(options.docs.remove);

  return {
    rows: data?.[options.keys.listKey] ?? [],
    loading,
    refetch,
    createRow: async (input: TCreateInput) => {
      await createMutation({ variables: options.toCreateVariables(input) });
      await refetch();
    },
    updateRow: async (id: string, input: TUpdateInput) => {
      await updateMutation({ variables: options.toUpdateVariables(id, input) });
      await refetch();
    },
    deleteRow: async (id: string) => {
      await deleteMutation({ variables: { id } });
      await refetch();
    },
  };
}
