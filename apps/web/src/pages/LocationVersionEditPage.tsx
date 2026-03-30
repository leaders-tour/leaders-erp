import { useParams, useSearchParams } from 'react-router-dom';
import { LocationVersionEditPanel } from '../features/location/location-version-edit-panel';

export function LocationVersionEditPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const { locationId, versionId } = useParams<{ locationId: string; versionId: string }>();
  const mode = searchParams.get('mode');
  const isCreateMode = mode === 'create';

  if (!locationId || !versionId) {
    return <section className="py-8 text-sm text-slate-600">잘못된 경로입니다.</section>;
  }

  return (
    <section>
      <LocationVersionEditPanel locationId={locationId} versionId={versionId} isCreateMode={isCreateMode} />
    </section>
  );
}
