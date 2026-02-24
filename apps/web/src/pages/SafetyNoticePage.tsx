import { z } from 'zod';
import { CrudScreen } from '../components/layout/CrudScreen';
import { useSafetyNoticeCrud, type SafetyNoticeRow } from '../features/safety-notice/hooks';

const schema = z.object({
  title: z.string().min(1),
  contentMd: z.string().min(1),
});

export function SafetyNoticePage(): JSX.Element {
  const crud = useSafetyNoticeCrud();

  return (
    <CrudScreen<SafetyNoticeRow, typeof schema>
      title="주의사항"
      rows={crud.rows}
      loading={crud.loading}
      schema={schema}
      fields={[
        { name: 'title', label: '제목' },
        { name: 'contentMd', label: '내용 (Markdown)', type: 'textarea' },
      ]}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: '제목' },
        { key: 'updatedAt', label: '수정일' },
      ]}
      createDefaultValues={{ title: '', contentMd: '' }}
      toUpdateValues={(row) => ({
        title: row.title,
        contentMd: row.contentMd,
      })}
      onCreate={crud.createRow}
      onUpdate={crud.updateRow}
      onDelete={crud.deleteRow}
    />
  );
}
