import { useQuery } from '@apollo/client';
import { APP_SETTINGS_DEFAULT, getCurrentRentalItemPreset, type RentalItemPreset } from '@tour/validation';
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

export function mapGqlRentalItemPresets(
  row: AppSettingsQuery['appSettings'] | null | undefined,
): RentalItemPreset[] {
  if (!row) {
    return APP_SETTINGS_DEFAULT.rentalItemPresets;
  }
  return row.rentalItemPresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    current: preset.current,
    sharedQuantityRules: preset.sharedQuantityRules.map((rule) => ({
      id: rule.id,
      minHeadcount: rule.minHeadcount,
      maxHeadcount: rule.maxHeadcount ?? null,
      quantity: rule.quantity,
    })),
    items: preset.items.map((item) => ({
      id: item.id,
      label: item.label,
      unit: item.unit,
      quantityFormula: item.quantityFormula,
    })),
  }));
}

export function useCurrentRentalItemPreset(): {
  preset: RentalItemPreset;
  loading: boolean;
} {
  const { data, loading } = useQuery(AppSettingsDocument, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const presets = mapGqlRentalItemPresets(data?.appSettings);

  return {
    preset: getCurrentRentalItemPreset(presets),
    loading,
  };
}
