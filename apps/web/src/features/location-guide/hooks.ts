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

const CREATE_MUTATION = `
  mutation CreateLocationGuide($input: LocationGuideCreateInput!) {
    createLocationGuide(input: $input) {
      id
    }
  }
`;

const UPDATE_MUTATION = `
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
  images?: File[];
  locationId: string;
}

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql';

async function runUploadMutation(
  query: string,
  variables: Record<string, unknown>,
  files: File[],
  mapPathFactory: (index: number) => string,
) {
  const operations = {
    query,
    variables,
  };

  const map: Record<string, string[]> = {};
  const formData = new FormData();
  formData.append('operations', JSON.stringify(operations));

  files.forEach((file, index) => {
    const key = String(index);
    map[key] = [mapPathFactory(index)];
    formData.append(key, file);
  });

  formData.append('map', JSON.stringify(map));

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    body: formData,
    headers: {
      'apollo-require-preflight': 'true',
    },
  });
  const json = (await response.json()) as {
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok) {
    throw new Error(`Upload request failed: ${response.status}`);
  }
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL upload failed');
  }
}

export function useLocationGuideCrud() {
  const { data, loading, refetch } = useQuery<{ locationGuides: LocationGuideRow[] }>(LIST);
  const { data: locationData } = useQuery<{ locations: GuideLocationOption[] }>(LOCATIONS);

  const [deleteMutation] = useMutation(REMOVE);
  const [connectMutation] = useMutation(CONNECT);
  const [disconnectMutation] = useMutation(DISCONNECT);

  return {
    rows: data?.locationGuides ?? [],
    locations: locationData?.locations ?? [],
    loading,
    createRow: async (input: LocationGuideFormInput) => {
      if (!input.images || input.images.length === 0) {
        throw new Error('At least one image is required');
      }
      await runUploadMutation(
        CREATE_MUTATION,
        {
          input: {
            title: input.title.trim(),
            description: input.description.trim(),
            locationId: input.locationId,
            images: input.images.map(() => null),
          },
        },
        input.images,
        (index) => `variables.input.images.${index}`,
      );
      await refetch();
    },
    updateRow: async (id: string, input: LocationGuideFormInput) => {
      const files = input.images ?? [];
      const updateInput: {
        title: string;
        description: string;
        images?: null[];
      } = {
        title: input.title.trim(),
        description: input.description.trim(),
      };
      if (files.length > 0) {
        updateInput.images = files.map(() => null);
      }

      await runUploadMutation(UPDATE_MUTATION, { id, input: updateInput }, files, (index) => `variables.input.images.${index}`);
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
