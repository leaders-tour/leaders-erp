import { gql, useQuery } from '@apollo/client';

export interface EstimateLocationGuideRow {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  locationId: string | null;
  location: {
    id: string;
    name: string[];
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

export function useEstimateLocationGuides(options?: {
  skip?: boolean;
}): { guideRows: EstimateLocationGuideRow[]; loading: boolean } {
  const skip = options?.skip ?? false;
  const { data, loading } = useQuery<{ locationGuides: EstimateLocationGuideRow[] }>(LOCATION_GUIDES_QUERY, {
    skip,
  });

  return {
    guideRows: skip ? [] : (data?.locationGuides ?? []),
    loading: skip ? false : loading,
  };
}
