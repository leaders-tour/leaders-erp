import { Button, Card, Input, Table, Td, Th } from '@tour/ui';
import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LocationSubNav } from '../features/location/sub-nav';
import { useLocationGuideCrud } from '../features/location-guide/hooks';

interface FormState {
  title: string;
  description: string;
  locationId: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  locationId: '',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

export function LocationGuidePage(): JSX.Element {
  const locationPath = useLocation();
  const crud = useLocationGuideCrud();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editingRow = editingId ? crud.rows.find((row) => row.id === editingId) : undefined;
  const availableLocations = crud.locations.filter(
    (item) => !item.guide || (editingRow && editingRow.locationId === item.id),
  );
  const canSubmit =
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.locationId.length > 0 &&
    (editingId ? true : selectedFiles.length > 0);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">여행지 안내사항</h1>
        <p className="text-sm text-slate-600">소개를 생성하고 목적지와 1:1로 연결합니다.</p>
      </header>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">{editingId ? '소개 수정' : '소개 생성'}</h2>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit) {
              return;
            }

            setSubmitting(true);
            try {
              const payload = {
                title: form.title,
                description: form.description,
                locationId: form.locationId,
                images: selectedFiles.length > 0 ? selectedFiles : undefined,
              };

              if (editingId) {
                await crud.updateRow(editingId, payload);
              } else {
                await crud.createRow(payload);
              }
              setForm(EMPTY_FORM);
              setEditingId('');
              setSelectedFiles([]);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="grid gap-1 text-sm">
            <span>제목</span>
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="예: 바양작 A 경유 소개"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>설명</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={5}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{editingId ? '이미지 파일 (선택 시 전체 교체)' : '이미지 파일 (필수)'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                setSelectedFiles(files);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <span className="text-xs text-slate-500">
              허용 형식: jpg/png/webp, 파일당 최대 25MB, 최대 20장
            </span>
            {editingRow ? <span className="text-xs text-slate-500">현재 저장된 이미지: {editingRow.imageUrls.length}개</span> : null}
            {selectedFiles.length > 0 ? (
              <span className="text-xs text-slate-600">선택된 새 이미지: {selectedFiles.length}개</span>
            ) : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span>연결할 목적지 (필수)</span>
            <select
              value={form.locationId}
              onChange={(event) => setForm((prev) => ({ ...prev, locationId: event.target.value }))}
              disabled={Boolean(editingId)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
                <option value="">목적지 선택</option>
                {availableLocations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {!editingId && availableLocations.length === 0 ? (
                <span className="text-xs text-amber-700">연결 가능한 목적지가 없습니다. 기존 연결을 먼저 해제해주세요.</span>
              ) : null}
              {editingId ? <span className="text-xs text-slate-500">연결 변경은 목적지 상세에서 해제/재연결로 처리합니다.</span> : null}
            </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? '저장 중...' : editingId ? '수정 저장' : '소개 생성'}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId('');
                  setForm(EMPTY_FORM);
                  setSelectedFiles([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                취소
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold">소개 목록</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>제목</Th>
              <Th>연결 목적지</Th>
              <Th>이미지</Th>
              <Th>수정일</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {crud.rows.map((row) => (
              <tr key={row.id}>
                <Td>
                  <div className="font-medium text-slate-800">{row.title}</div>
                  <div className="mt-1 max-w-xl whitespace-pre-wrap text-xs text-slate-500">{row.description}</div>
                </Td>
                <Td>{row.location?.name ?? '-'}</Td>
                <Td>{row.imageUrls.length}개</Td>
                <Td>{formatDate(row.updatedAt)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          title: row.title,
                          description: row.description,
                          locationId: row.locationId ?? '',
                        });
                        setSelectedFiles([]);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!window.confirm('정말 삭제할까요?')) {
                          return;
                        }
                        await crud.deleteRow(row.id);
                        if (editingId === row.id) {
                          setEditingId('');
                          setForm(EMPTY_FORM);
                          setSelectedFiles([]);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
