import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from './google-maps-api-key';

/** Google Maps JS API는 앱에서 한 번만, 같은 옵션으로 로드해야 한다. */
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: 'google-maps-ko',
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  language: 'ko',
  region: 'KR',
} as const;

export const DEFAULT_GOOGLE_MAP_TYPE_ID = 'hybrid';

export function useGoogleMapsLoader(): { isLoaded: boolean; loadError: Error | undefined } {
  return useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
}
