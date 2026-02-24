import { Link, Navigate, useParams } from 'react-router-dom';
import { useLocationDetail } from '../features/location/hooks';

export function LocationEditPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { location, loading } = useLocationDetail(id);

  if (loading) {
    return <section className="py-8 text-sm text-slate-600">불러오는 중...</section>;
  }

  if (!location || !id) {
    return (
      <section className="grid gap-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">목적지를 찾을 수 없습니다.</h1>
        <div>
          <Link to="/locations/list" className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
            목록으로 이동
          </Link>
        </div>
      </section>
    );
  }

  if (!location.defaultVersionId) {
    return (
      <section className="grid gap-4 py-8 text-sm text-slate-600">
        기본 버전이 없어 편집할 수 없습니다.
      </section>
    );
  }

  return <Navigate to={`/locations/${id}/versions/${location.defaultVersionId}/edit`} replace />;
}
