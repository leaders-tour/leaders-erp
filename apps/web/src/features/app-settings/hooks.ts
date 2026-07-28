import { useQuery } from '@apollo/client';
import {
  APP_SETTINGS_DEFAULT,
  getCurrentRentalItemPreset,
  normalizeFlightTimeSettings,
  type FlightTimeSettings,
  type RentalItemPreset,
  DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK,
} from '@tour/validation';
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

export function useTourListRentalItemStock(): {
  stock: { drone: number; starlink: number; powerbank: number };
  loading: boolean;
} {
  const { data, loading } = useQuery(AppSettingsDocument, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const stock = data?.appSettings.tourListRentalItemStock ?? {
    drone: DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK.DRONE,
    starlink: DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK.STARLINK,
    powerbank: DEFAULT_TOUR_LIST_RENTAL_ITEM_STOCK.POWERBANK,
  };

  return { stock, loading };
}

export function mapGqlFlightTimeSettings(
  row: AppSettingsQuery['appSettings'] | null | undefined,
): FlightTimeSettings {
  if (!row?.flightTimeSettings) {
    return APP_SETTINGS_DEFAULT.flightTimeSettings;
  }
  return normalizeFlightTimeSettings({
    inTimeShortcuts: row.flightTimeSettings.inTimeShortcuts,
    outTimeShortcuts: row.flightTimeSettings.outTimeShortcuts,
    defaultInTime: row.flightTimeSettings.defaultInTime,
    defaultOutTime: row.flightTimeSettings.defaultOutTime,
  });
}

export function useFlightTimeSettings(): {
  flightTimeSettings: FlightTimeSettings;
  loading: boolean;
} {
  const { data, loading } = useQuery(AppSettingsDocument, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  return {
    flightTimeSettings: mapGqlFlightTimeSettings(data?.appSettings),
    loading,
  };
}
