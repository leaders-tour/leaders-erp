import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { mergeLocationNameAndTag, splitLocationNameAndTag } from '../features/location/display';
import { LocationProfileForm, createDefaultLocationProfileFormValue } from '../features/location/profile-form';
import { useLocationCrud, useLocationDetail } from '../features/location/hooks';
import { LocationSubNav } from '../features/location/sub-nav';

export function LocationEditPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const locationPath = useLocation();
  const navigate = useNavigate();
  const crud = useLocationCrud();
  const { location, loading } = useLocationDetail(id);
  const [value, setValue] = useState(createDefaultLocationProfileFormValue());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!location) {
      return;
    }
    const parsedName = splitLocationNameAndTag(location.name);
    setValue({
      regionId: location.regionId,
      name: parsedName.name,
      tag: parsedName.tag ?? '',
      internalMovementDistance: location.internalMovementDistance ?? null,
      timeSlots:
        location.timeBlocks.length > 0
          ? location.timeBlocks.map((timeBlock) => ({
              startTime: timeBlock.startTime,
              activities: timeBlock.activities.length > 0 ? timeBlock.activities.map((activity) => activity.description) : [''],
            }))
          : [{ startTime: '08:00', activities: ['', '', '', ''] }],
      lodging: {
        isUnspecified: (location.lodgings[0]?.name ?? '') === '숙소 미지정',
        name: location.lodgings[0]?.name ?? '여행자 캠프',
        hasElectricity: location.lodgings[0]?.hasElectricity ?? false,
        hasShower: location.lodgings[0]?.hasShower ?? false,
        hasInternet: location.lodgings[0]?.hasInternet ?? false,
      },
      meals: {
        breakfast: location.mealSets[0]?.breakfast ?? null,
        lunch: location.mealSets[0]?.lunch ?? null,
        dinner: location.mealSets[0]?.dinner ?? null,
      },
    });
  }, [location]);

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

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={locationPath.pathname} />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">목적지 편집</h1>
            <p className="mt-1 text-sm text-slate-600">{location.name}</p>
          </div>
          <Link to={`/locations/${id}`} className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            상세로 이동
          </Link>
        </div>
      </header>

      <LocationProfileForm
        title="목적지 편집"
        submitLabel="저장"
        value={value}
        submitting={submitting}
        onSubmit={async (next) => {
          setSubmitting(true);
          try {
            await crud.updateProfile(id, {
              ...next,
              name: mergeLocationNameAndTag(next.name, next.tag),
            });
            navigate(`/locations/${id}`);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </section>
  );
}
