import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GRAPHQL_URL } from './graphql-endpoint';

const PUBLIC_OPERATIONS = new Set(['Login', 'RefreshAccessToken', 'Logout']);

export function createApolloClient(input: {
  getAccessToken: () => string | null;
  ensureAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
}): ApolloClient<object> {
  const authLink = setContext(async (operation, previousContext) => {
    let accessToken = input.getAccessToken();

    if (!PUBLIC_OPERATIONS.has(operation.operationName ?? '')) {
      accessToken = await input.ensureAccessToken();
    }

    return {
      headers: {
        ...previousContext.headers,
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
    };
  });

  return new ApolloClient({
    link: from([
      authLink,
      new HttpLink({
        uri: GRAPHQL_URL,
        credentials: 'include',
      }),
    ]),
    cache: new InMemoryCache(),
  });
}
