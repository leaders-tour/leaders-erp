import { ApolloProvider } from '@apollo/client';
import { useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import { AuthProvider, useAuth } from '../features/auth/context';
import { createApolloClient } from '../lib/apollo';

function ApolloAppProvider({ children }: PropsWithChildren): JSX.Element {
  const { employee, ensureAccessToken, getAccessToken, status } = useAuth();
  const client = useMemo(
    () =>
      createApolloClient({
        ensureAccessToken,
        getAccessToken,
      }),
    [ensureAccessToken, getAccessToken],
  );
  const previousSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionKey = employee?.id ?? status;
    if (previousSessionKeyRef.current && previousSessionKeyRef.current !== sessionKey) {
      void client.clearStore();
    }
    previousSessionKeyRef.current = sessionKey;
  }, [client, employee?.id, status]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return (
    <AuthProvider>
      <ApolloAppProvider>{children}</ApolloAppProvider>
    </AuthProvider>
  );
}
