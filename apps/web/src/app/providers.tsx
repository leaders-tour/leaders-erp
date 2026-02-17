import { ApolloProvider } from '@apollo/client';
import type { PropsWithChildren } from 'react';
import { apolloClient } from '../lib/apollo';

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
