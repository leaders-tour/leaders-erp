import { EmployeeRole } from '@tour/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { GRAPHQL_URL } from '../../lib/graphql-endpoint';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionEmployee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
}

interface AuthPayload {
  accessToken: string;
  employee: SessionEmployee;
  expiresAt: string;
}

const PDF_RENDER_AUTH_SESSION_STORAGE_KEY = 'tour_estimate_pdf_auth_session';

interface AuthContextValue {
  status: AuthStatus;
  employee: SessionEmployee | null;
  expiresAt: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  ensureAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      expiresAt
      employee {
        id
        name
        email
        role
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation RegisterEmployee($input: EmployeeSelfSignupInput!) {
    registerEmployee(input: $input) {
      accessToken
      expiresAt
      employee {
        id
        name
        email
        role
      }
    }
  }
`;

const REFRESH_MUTATION = `
  mutation RefreshAccessToken {
    refreshAccessToken {
      accessToken
      expiresAt
      employee {
        id
        name
        email
        role
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout {
    logout
  }
`;

function readPdfRenderBootstrapSession(): AuthPayload | null {
  try {
    const raw = window.sessionStorage.getItem(PDF_RENDER_AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    window.sessionStorage.removeItem(PDF_RENDER_AUTH_SESSION_STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<AuthPayload> | null;
    if (
      !parsed ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !parsed.employee ||
      typeof parsed.employee.id !== 'string' ||
      typeof parsed.employee.name !== 'string' ||
      typeof parsed.employee.email !== 'string' ||
      typeof parsed.employee.role !== 'string'
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      employee: {
        id: parsed.employee.id,
        name: parsed.employee.name,
        email: parsed.employee.email,
        role: parsed.employee.role as SessionEmployee['role'],
      },
    };
  } catch (_error) {
    return null;
  }
}

async function requestGraphql<TData>(query: string, variables?: Record<string, unknown>): Promise<TData> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const payload = (await response.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message || '요청에 실패했습니다.');
  }

  if (!response.ok || !payload.data) {
    throw new Error('요청에 실패했습니다.');
  }

  return payload.data;
}

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [employee, setEmployee] = useState<SessionEmployee | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef<string | null>(null);
  const statusRef = useRef<AuthStatus>('loading');
  const bootstrapSessionActiveRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((payload: AuthPayload, options?: { bootstrap?: boolean }): string => {
    accessTokenRef.current = payload.accessToken;
    expiresAtRef.current = payload.expiresAt;
    bootstrapSessionActiveRef.current = options?.bootstrap === true;
    statusRef.current = 'authenticated';
    setEmployee(payload.employee);
    setExpiresAt(payload.expiresAt);
    setStatus('authenticated');
    return payload.accessToken;
  }, []);

  const clearSession = useCallback((): null => {
    accessTokenRef.current = null;
    expiresAtRef.current = null;
    bootstrapSessionActiveRef.current = false;
    statusRef.current = 'unauthenticated';
    setEmployee(null);
    setExpiresAt(null);
    setStatus('unauthenticated');
    return null;
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = requestGraphql<{ refreshAccessToken: AuthPayload }>(REFRESH_MUTATION)
      .then((data) => applySession(data.refreshAccessToken, { bootstrap: false }))
      .catch(() => clearSession())
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = promise;
    return promise;
  }, [applySession, clearSession]);

  useEffect(() => {
    const bootstrapSession = readPdfRenderBootstrapSession();
    if (bootstrapSession) {
      applySession(bootstrapSession, { bootstrap: true });
      return;
    }

    void refreshSession();
  }, [applySession, refreshSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const data = await requestGraphql<{ login: AuthPayload }>(LOGIN_MUTATION, {
        input: { email, password },
      });
      applySession(data.login, { bootstrap: false });
    },
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      const data = await requestGraphql<{ registerEmployee: AuthPayload }>(REGISTER_MUTATION, {
        input: { name, email, password },
      });
      applySession(data.registerEmployee, { bootstrap: false });
    },
    [applySession],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await requestGraphql<{ logout: boolean }>(LOGOUT_MUTATION);
    } catch (_error) {
      // Session may already be gone; local state still needs to clear.
    }
    clearSession();
  }, [clearSession]);

  const ensureAccessToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!forceRefresh && accessTokenRef.current && expiresAtRef.current) {
        const expiresAtTime = Date.parse(expiresAtRef.current);
        if (!Number.isNaN(expiresAtTime)) {
          if (bootstrapSessionActiveRef.current && expiresAtTime > Date.now()) {
            return accessTokenRef.current;
          }

          if (!bootstrapSessionActiveRef.current && expiresAtTime - Date.now() > 30_000) {
            return accessTokenRef.current;
          }
        }
      }

      if (statusRef.current === 'unauthenticated') {
        return null;
      }

      return refreshSession();
    },
    [refreshSession],
  );

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      employee,
      expiresAt,
      login,
      register,
      logout,
      ensureAccessToken,
      getAccessToken,
    }),
    [employee, ensureAccessToken, expiresAt, getAccessToken, login, logout, register, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
