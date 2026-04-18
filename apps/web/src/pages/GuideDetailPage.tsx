import { Button, Card } from '@tour/ui';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGuide,
  useRemoveGuideCertImage,
  useUpdateGuide,
  useUploadGuideCertImages,
  useUploadGuideProfileImage,
} from '../features/guide/hooks';

const LEVEL_OPTIONS = [
  { value: 'MAIN', label: '메인' },
  { value: 'JUNIOR', label: '주니어' },
  { value: 'ROOKIE', label: '신입' },
  { value: 'OTHER', label: '기타' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE_SEASON', label: '2026 시즌' },
  { value: 'INTERVIEW_DONE', label: '면접 완료' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'OTHER', label: '기타' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export function GuideDetailPage(): JSX.Element {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const { guide, loading, refetch } = useGuide(guideId);
  const { updateGuide, loading: saving } = useUpdateGuide();
  const { uploadProfileImage, loading: uploadingProfile } = useUploadGuideProfileImage();
  const { uploadCertImages, loading: uploadingCert } = useUploadGuideCertImages();
  const { removeCertImage, loading: removingCert } = useRemoveGuideCertImage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const certInputRef = useRef<HTMLInputElement | null>(null);

  if (loading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>;
  }
  if (!guide) {
    return (
      <p className="text-sm text-rose-500">
        가이드를 찾을 수 없습니다. <button onClick={() => navigate(-1)} className="underline">뒤로</button>
      </p>
    );
  }

  const startEdit = () => {
    setForm({
      nameKo: guide.nameKo,
      nameMn: guide.nameMn ?? '',
      level: guide.level,
      status: guide.status,
      gender: guide.gender ?? '',
      birthYear: guide.birthYear?.toString() ?? '',
      isSmoker: guide.isSmoker ? 'true' : 'false',
      experienceYears: guide.experienceYears?.toString() ?? '',
      joinYear: guide.joinYear?.toString() ?? '',
      phone: guide.phone ?? '',
      note: guide.note ?? '',
    });
    setEditing(true);
    setSaveError(null);
  };

  const save = async () => {
    if (!guide) return;
    setSaveError(null);
    try {
      await updateGuide(guide.id, {
        nameKo: form.nameKo,
        nameMn: form.nameMn || null,
        level: form.level as any,
        status: form.status as any,
        gender: (form.gender as any) || null,
        birthYear: form.birthYear ? parseInt(form.birthYear, 10) : null,
        isSmoker: form.isSmoker === 'true',
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
        joinYear: form.joinYear ? parseInt(form.joinYear, 10) : null,
        phone: form.phone || null,
        note: form.note || null,
      });
      await refetch();
      setEditing(false);
    } catch (e) {
      setSaveError(String(e));
    }
  };

  return (
    <section className="grid max-w-4xl gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← 목록
        </button>
        {!editing ? (
          <Button variant="default" onClick={startEdit}>
            편집
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setEditing(false)} disabled={saving}>
              취소
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{saveError}</div>
      )}

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-6 border-b border-slate-100 p-6">
          <div className="flex flex-col items-center gap-2">
            {guide.profileImageUrl ? (
              <img
                src={guide.profileImageUrl}
                alt={guide.nameKo}
                className="h-24 w-24 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-3xl font-semibold text-slate-500">
                {guide.nameKo.slice(0, 1)}
              </div>
            )}
            <input
              ref={profileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !guideId) return;
                await uploadProfileImage(guideId, file);
                await refetch();
                if (profileInputRef.current) profileInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploadingProfile}
              onClick={() => profileInputRef.current?.click()}
              className="text-xs text-indigo-600 hover:underline disabled:text-slate-400"
            >
              {uploadingProfile ? '업로드 중...' : '프로필 변경'}
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{guide.nameKo}</h2>
            {guide.nameMn && <p className="text-sm text-slate-500">{guide.nameMn}</p>}
            <div className="mt-2 flex gap-2">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {LEVEL_OPTIONS.find((o) => o.value === guide.level)?.label ?? guide.level}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {STATUS_OPTIONS.find((o) => o.value === guide.status)?.label ?? guide.status}
              </span>
            </div>
          </div>
        </div>

        {!editing ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 sm:grid-cols-3">
            <Field label="성별">
              {guide.gender === 'MALE' ? '남' : guide.gender === 'FEMALE' ? '여' : '-'}
            </Field>
            <Field label="출생년도">{guide.birthYear ?? '-'}</Field>
            <Field label="흡연 여부">{guide.isSmoker ? '흡연' : '비흡연'}</Field>
            <Field label="경력">{guide.experienceYears != null ? `${guide.experienceYears}년차` : '-'}</Field>
            <Field label="입사 연도">{guide.joinYear ?? '-'}</Field>
            <Field label="전화번호">{guide.phone ?? '-'}</Field>
            {guide.note && (
              <div className="col-span-full">
                <Field label="특이사항">
                  <span className="whitespace-pre-wrap">{guide.note}</span>
                </Field>
              </div>
            )}
          </dl>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
            {[
              { key: 'nameKo', label: '이름 (한국)', type: 'text' },
              { key: 'nameMn', label: '몽골 이름', type: 'text' },
              { key: 'phone', label: '전화번호', type: 'text' },
              { key: 'birthYear', label: '출생년도', type: 'number' },
              { key: 'experienceYears', label: '경력 (년차)', type: 'number' },
              { key: 'joinYear', label: '입사 연도', type: 'number' },
            ].map(({ key, label, type }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">{label}</span>
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            ))}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">레벨</span>
              <select
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">상태</span>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">성별</span>
              <select
                value={form.gender}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="">-</option>
                <option value="MALE">남</option>
                <option value="FEMALE">여</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">흡연 여부</span>
              <select
                value={form.isSmoker}
                onChange={(e) => setForm((prev) => ({ ...prev, isSmoker: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="false">비흡연</option>
                <option value="true">흡연</option>
              </select>
            </label>

            <label className="col-span-full flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">특이사항</span>
              <textarea
                rows={3}
                value={form.note ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        )}
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">자격증 사본</h3>
          <div className="flex items-center gap-2">
            <input
              ref={certInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0 || !guideId) return;
                await uploadCertImages(guideId, Array.from(files));
                await refetch();
                if (certInputRef.current) certInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploadingCert}
              onClick={() => certInputRef.current?.click()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:text-slate-400"
            >
              {uploadingCert ? '업로드 중...' : '+ 이미지 추가'}
            </button>
          </div>
        </div>
        {guide.certImageUrls.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 자격증 사본이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {guide.certImageUrls.map((url, i) => (
              <div key={i} className="group relative">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`자격증 ${i + 1}`}
                    className="h-32 w-auto rounded-lg border border-slate-200 object-cover"
                  />
                </a>
                <button
                  type="button"
                  disabled={removingCert}
                  onClick={async () => {
                    if (!guideId || !window.confirm('이 이미지를 삭제할까요?')) return;
                    await removeCertImage(guideId, url);
                    await refetch();
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white text-xs hover:bg-rose-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
