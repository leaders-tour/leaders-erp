import { gql } from '@apollo/client';
import { useCrudResource } from '../../lib/crud';

interface RegionLodgingRow {
  id: string;
  regionId: string;
  name: string;
  priceKrw: number | null;
  pricePerPersonKrw: number | null;
  pricePerTeamKrw: number | null;
  isActive: boolean;
  sortOrder: number;
  region?: {
    id: string;
    name: string;
  } | null;
}

const LIST = gql`
  query RegionLodgings($regionId: ID, $activeOnly: Boolean) {
    regionLodgings(regionId: $regionId, activeOnly: $activeOnly) {
      id
      regionId
      name
      priceKrw
      pricePerPersonKrw
      pricePerTeamKrw
      isActive
      sortOrder
      region {
        id
        name
      }
    }
  }
`;

const CREATE = gql`
  mutation CreateRegionLodging($input: RegionLodgingCreateInput!) {
    createRegionLodging(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateRegionLodging($id: ID!, $input: RegionLodgingUpdateInput!) {
    updateRegionLodging(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteRegionLodging($id: ID!) {
    deleteRegionLodging(id: $id)
  }
`;

export interface RegionLodgingFormInput {
  regionId: string;
  name: string;
  priceKrw?: number | null;
  pricePerPersonKrw?: number | null;
  pricePerTeamKrw?: number | null;
  isActive: boolean;
  sortOrder: number;
}

function normalizeNullableNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function useRegionLodgingCrud() {
  return useCrudResource<RegionLodgingRow, RegionLodgingFormInput, RegionLodgingFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: {
      listKey: 'regionLodgings',
      createKey: 'createRegionLodging',
      updateKey: 'updateRegionLodging',
      removeKey: 'deleteRegionLodging',
    },
    toCreateVariables: (input) => ({
      input: {
        regionId: input.regionId.trim(),
        name: input.name.trim(),
        priceKrw: normalizeNullableNumber(input.priceKrw),
        pricePerPersonKrw: normalizeNullableNumber(input.pricePerPersonKrw),
        pricePerTeamKrw: normalizeNullableNumber(input.pricePerTeamKrw),
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        regionId: input.regionId.trim(),
        name: input.name.trim(),
        priceKrw: normalizeNullableNumber(input.priceKrw),
        pricePerPersonKrw: normalizeNullableNumber(input.pricePerPersonKrw),
        pricePerTeamKrw: normalizeNullableNumber(input.pricePerTeamKrw),
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    }),
  });
}
