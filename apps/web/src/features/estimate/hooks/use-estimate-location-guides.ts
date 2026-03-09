import { gql, useQuery } from '@apollo/client';

export interface EstimateLocationGuideRow {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  locationId: string | null;
  location: {
    id: string;
    name: string;
  } | null;
}

const LOCATION_GUIDES_QUERY = gql`
  query EstimateLocationGuides {
    locationGuides {
      id
      title
      description
      imageUrls
      locationId
      location {
        id
        name
      }
    }
  }
`;

export function useEstimateLocationGuides(): { guideRows: EstimateLocationGuideRow[]; loading: boolean } {
  const { data, loading } = useQuery<{ locationGuides: EstimateLocationGuideRow[] }>(LOCATION_GUIDES_QUERY);

  return {
    guideRows: data?.locationGuides ?? [],
    loading,
  };
}
