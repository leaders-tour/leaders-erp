import { gql, useMutation, useQuery } from '@apollo/client';

const LIST = gql`
  query LocationGuides {
    locationGuides {
      id
      title
      description
      imageUrls
      locationId
      updatedAt
      location {
        id
        name
      }
    }
  }
`;

const LOCATIONS = gql`
  query GuideLocations {
    locations {
      id
      name
      guide {
        id
      }
    }
  }
`;

const CREATE = gql`
  mutation CreateLocationGuide($input: LocationGuideCreateInput!) {
    createLocationGuide(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateLocationGuide($id: ID!, $input: LocationGuideUpdateInput!) {
    updateLocationGuide(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteLocationGuide($id: ID!) {
    deleteLocationGuide(id: $id)
  }
`;

const CONNECT = gql`
  mutation ConnectLocationGuide($locationId: ID!, $guideId: ID!) {
    connectLocationGuide(locationId: $locationId, guideId: $guideId) {
      id
      locationId
    }
  }
`;

const DISCONNECT = gql`
  mutation DisconnectLocationGuide($locationId: ID!) {
    disconnectLocationGuide(locationId: $locationId) {
      id
      locationId
    }
  }
`;

export interface LocationGuideRow {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  locationId: string | null;
  updatedAt: string;
  location: {
    id: string;
    name: string;
  } | null;
}

export interface GuideLocationOption {
  id: string;
  name: string;
  guide: {
    id: string;
  } | null;
}

export interface LocationGuideFormInput {
  title: string;
  description: string;
  imageUrls: string[];
  locationId: string;
}

export function useLocationGuideCrud() {
  const { data, loading, refetch } = useQuery<{ locationGuides: LocationGuideRow[] }>(LIST);
  const { data: locationData } = useQuery<{ locations: GuideLocationOption[] }>(LOCATIONS);

  const [createMutation] = useMutation(CREATE);
  const [updateMutation] = useMutation(UPDATE);
  const [deleteMutation] = useMutation(REMOVE);
  const [connectMutation] = useMutation(CONNECT);
  const [disconnectMutation] = useMutation(DISCONNECT);

  return {
    rows: data?.locationGuides ?? [],
    locations: locationData?.locations ?? [],
    loading,
    createRow: async (input: LocationGuideFormInput) => {
      await createMutation({
        variables: {
          input: {
            title: input.title.trim(),
            description: input.description.trim(),
            imageUrls: input.imageUrls,
            locationId: input.locationId,
          },
        },
      });
      await refetch();
    },
    updateRow: async (id: string, input: LocationGuideFormInput) => {
      await updateMutation({
        variables: {
          id,
          input: {
            title: input.title.trim(),
            description: input.description.trim(),
            imageUrls: input.imageUrls,
          },
        },
      });
      await refetch();
    },
    deleteRow: async (id: string) => {
      await deleteMutation({ variables: { id } });
      await refetch();
    },
    connectGuide: async (locationId: string, guideId: string) => {
      await connectMutation({ variables: { locationId, guideId } });
      await refetch();
    },
    disconnectGuide: async (locationId: string) => {
      await disconnectMutation({ variables: { locationId } });
      await refetch();
    },
    refetch,
  };
}
