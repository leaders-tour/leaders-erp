import { Button, Card, Input } from '@tour/ui';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LocationProfileForm, createDefaultLocationProfileFormValue } from './profile-form';
import { formatLocationNameInline } from './display';
import { useLocationCrud, useLocationVersionDetail } from './hooks';
import { mealsFromVersionMealSets } from './location-version-meals';

export interface LocationVersionEditPanelProps {
  locationId: string;
  versionId: string;
  isCreateMode: boolean;
  onProfileSaved?: () => void;
}

export function LocationVersionEditPanel({
  locationId,
  versionId,
  isCreateMode,
  onProfileSaved,
}: LocationVersionEditPanelProps): JSX.Element {
  const navigate = useNavigate();
  const { version, loading } = useLocationVersionDetail(versionId);
  const crud = useLocationCrud();

  const [value, setValue] = useState(createDefaultLocationProfileFormValue());
  const [versionLabel, setVersionLabel] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!version) {
      return;
    }

    setValue({
      regionId: version.location.regionId,
      name: version.locationNameSnapshot,
      isFirstDayEligible: version.location.isFirstDayEligible,
      isLastDayEligible: version.location.isLastDayEligible,
      firstDayTimeSlots:
        version.firstDayTimeBlocks.length > 0
          ? version.firstDayTimeBlocks.map((timeBlock) => ({
              startTime: timeBlock.startTime,
              activities: timeBlock.activities.length > 0 ? timeBlock.activities.map((activity) => activity.description) : [''],
            }))
          : [
              { startTime: '08:00', activities: ['', '', '', ''] },
              { startTime: '12:00', activities: ['', '', '', ''] },
              { startTime: '18:00', activities: ['', '', '', ''] },
            ],
      firstDayEarlyTimeSlots:
        version.firstDayEarlyTimeBlocks.length > 0
          ? version.firstDayEarlyTimeBlocks.map((timeBlock) => ({
              startTime: timeBlock.startTime,
              activities: timeBlock.activities.length > 0 ? timeBlock.activities.map((activity) => activity.description) : [''],
            }))
          : [
              { startTime: '08:00', activities: ['', '', '', ''] },
              { startTime: '12:00', activities: ['', '', '', ''] },
              { startTime: '18:00', activities: ['', '', '', ''] },
            ],
      firstDayAverageDistanceKm:
        version.firstDayAverageDistanceKm !== null && version.firstDayAverageDistanceKm !== undefined
          ? String(version.firstDayAverageDistanceKm)
          : '',
      firstDayAverageTravelHours:
        version.firstDayAverageTravelHours !== null && version.firstDayAverageTravelHours !== undefined
          ? String(version.firstDayAverageTravelHours)
          : '',
      lodging: {
        isUnspecified: (version.lodgings[0]?.name ?? '') === '숙소 미지정',
        name: version.lodgings[0]?.name ?? '여행자 캠프',
        hasElectricity: version.lodgings[0]?.hasElectricity ?? 'NO',
        hasShower: version.lodgings[0]?.hasShower ?? 'NO',
        hasInternet: version.lodgings[0]?.hasInternet ?? 'NO',
      },
      ...mealsFromVersionMealSets(version.mealSets),
    });
    if (isCreateMode) {
      setVersionLabel(version.label);
    }
  }, [isCreateMode, version]);

  if (loading) {
    return <div className="py-8 text-sm text-slate-600">불러오는 중...</div>;
  }

  if (!version || version.locationId !== locationId) {
    return (
      <div className="grid gap-4 py-8">
        <h2 className="text-xl font-semibold text-slate-900">버전을 찾을 수 없습니다.</h2>
        <div>
          <Button onClick={() => navigate('/locations/list')}>목록으로 이동</Button>
        </div>
      </div>
    );
  }

  const isDefault = version.location.defaultVersionId === version.id;

  if (!isCreateMode && !isDefault) {
    return (
      <div className="grid gap-4 py-4">
        <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-semibold text-amber-900">기본 버전만 직접 수정할 수 있습니다.</h2>
          <p className="mt-2 text-sm text-amber-800">
            이 버전을 수정하려면 새 버전을 생성하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/locations/${locationId}/versions/${version.id}/edit?mode=create`}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              새 버전 생성
            </Link>
            <Link
              to={`/locations/${locationId}/versions/${version.id}`}
              className="inline-flex items-center rounded-xl border border-amber-400 px-4 py-2 text-sm text-amber-900"
            >
              버전 상세
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {isCreateMode
            ? `'${formatLocationNameInline(version.locationNameSnapshot)} / ${version.label}' 기반 새 버전 생성`
            : `${version.label} 수정`}
        </h2>
        <p className="text-sm text-slate-600">
          {isCreateMode ? '이전 선택한 버전을 기준으로 새버전을 생성합니다.' : '기본 버전 본문을 직접 수정합니다.'}
        </p>
      </header>

      {isCreateMode ? (
        <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">버전 이름</span>
            <Input
              value={versionLabel}
              onChange={(event) => setVersionLabel(event.target.value)}
              placeholder="예: A 경유, + 삼겹살, 늦은 스타트"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700">변경 메모</span>
            <Input
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              placeholder="예: 숙소/식사 구성 변경"
            />
          </label>
        </Card>
      ) : null}

      <LocationProfileForm
        title={isCreateMode ? '새 버전 출발일 프로필' : '기본 버전 출발일 프로필'}
        submitLabel={isCreateMode ? '새 버전 생성' : '수정 저장'}
        submitVariant={isCreateMode ? 'primary' : 'default'}
        value={value}
        submitting={submitting}
        nameReadOnly={isCreateMode}
        eligibilityReadOnly={isCreateMode}
        onSubmit={async (next) => {
          setSubmitting(true);
          try {
            if (isCreateMode) {
              const nextLabel = versionLabel.trim();
              if (!nextLabel) {
                window.alert('버전 이름을 입력해주세요.');
                throw new Error('버전 이름이 필요합니다.');
              }
              const created = await crud.createVersion({
                locationId,
                sourceVersionId: version.id,
                label: nextLabel,
                changeNote: changeNote.trim() || undefined,
                profile: {
                  firstDayTimeSlots: next.firstDayTimeSlots,
                  firstDayEarlyTimeSlots: next.firstDayEarlyTimeSlots,
                  firstDayAverageDistanceKm: next.firstDayAverageDistanceKm,
                  firstDayAverageTravelHours: next.firstDayAverageTravelHours,
                  lodging: next.lodging,
                  meals: next.meals,
                  mealsEarly: next.mealsEarly,
                },
              });
              if (created?.id) {
                navigate(`/locations/${locationId}/versions/${created.id}`);
                return;
              }
              navigate(`/locations/${locationId}`);
              return;
            }

            await crud.updateProfile(locationId, next);
            if (onProfileSaved) {
              onProfileSaved();
              return;
            }
            navigate(`/locations/${locationId}`);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
