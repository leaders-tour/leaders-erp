import { useQuery } from '@apollo/client';
import { APP_SETTINGS_DEFAULT } from '@tour/validation';
import {
  AppSettingsDocument,
  type AppSettingsQuery,
} from '../../generated/graphql';
import type { MovementIntensityColorSetting } from '../estimate/model/movement-intensity';

export function mapGqlMovementIntensityColors(
  row: AppSettingsQuery['appSettings'] | null | undefined,
): MovementIntensityColorSetting[] {
  if (!row) {
    return APP_SETTINGS_DEFAULT.movementIntensityColors;
  }
  return row.movementIntensityColors.map((item) => ({
    level: item.level as MovementIntensityColorSetting['level'],
    color: item.color,
  }));
}

export function useMovementIntensityColorSettings(): {
  colors: MovementIntensityColorSetting[];
  loading: boolean;
} {
  const { data, loading } = useQuery(AppSettingsDocument, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  return {
    colors: mapGqlMovementIntensityColors(data?.appSettings),
    loading,
  };
}
