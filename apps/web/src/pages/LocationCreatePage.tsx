import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LocationProfileForm, createDefaultLocationProfileFormValue } from '../features/location/profile-form';
import { LocationSubNav } from '../features/location/sub-nav';
import { useLocationCrud } from '../features/location/hooks';
import { mergeLocationNameAndTag } from '../features/location/display';

export function LocationCreatePage(): JSX.Element {
  const crud = useLocationCrud();
  const location = useLocation();
  const [value, setValue] = useState(createDefaultLocationProfileFormValue());
  const [submitting, setSubmitting] = useState(false);

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <LocationSubNav pathname={location.pathname} />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">목적지 생성</h1>
        <p className="mt-1 text-sm text-slate-600">이름, 시간표, 숙소, 식사를 한 번에 생성합니다.</p>
      </header>

      <LocationProfileForm
        title="목적지 생성"
        submitLabel="목적지 생성"
        value={value}
        submitting={submitting}
        onSubmit={async (next) => {
          setSubmitting(true);
          try {
            await crud.createProfile({
              ...next,
              name: mergeLocationNameAndTag(next.name, next.tag),
            });
            setValue(createDefaultLocationProfileFormValue(next.regionId));
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </section>
  );
}
