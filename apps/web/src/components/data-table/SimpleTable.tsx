import { Button, Card, Table, Td, Th } from '@tour/ui';

export interface TableColumn<TItem> {
  key: keyof TItem;
  label: string;
}

interface SimpleTableProps<TItem extends { id: string }> {
  title: string;
  columns: TableColumn<TItem>[];
  rows: TItem[];
  onEdit: (row: TItem) => void;
  onDelete: (id: string) => void;
}

export function SimpleTable<TItem extends { id: string }>({
  title,
  columns,
  rows,
  onEdit,
  onDelete,
}: SimpleTableProps<TItem>): JSX.Element {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <Th key={String(column.key)}>{column.label}</Th>
            ))}
            <Th>액션</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <Td key={String(column.key)}>{String(row[column.key] ?? '')}</Td>
              ))}
              <Td>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onEdit(row)}>
                    수정
                  </Button>
                  <Button variant="destructive" onClick={() => onDelete(row.id)}>
                    삭제
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
