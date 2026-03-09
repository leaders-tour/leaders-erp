import type { EmployeeRole } from '@prisma/client';
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const DEFAULT_ACCESS_TOKEN_TTL_MINUTES = 30;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;
const DEFAULT_REFRESH_COOKIE_NAME = 'tour_refresh_token';
const DEFAULT_DEV_ACCESS_TOKEN_SECRET = 'tour-erp-dev-access-secret';
const ACCESS_TOKEN_AUDIENCE = 'tour-erp';
const ACCESS_TOKEN_TYPE = 'access';
let warnedMissingAccessTokenSecret = false;

export interface AuthenticatedEmployee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  isActive: boolean;
}

interface AccessTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: EmployeeRole;
  aud: string;
  type: string;
  iat: number;
  exp: number;
}

interface CookieOptions {
  httpOnly?: boolean;
  maxAgeMs?: number;
  path?: string;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getAccessTokenSecret(): string {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (!warnedMissingAccessTokenSecret) {
    process.stderr.write('[auth] AUTH_ACCESS_TOKEN_SECRET is missing; using local development fallback secret.\n');
    warnedMissingAccessTokenSecret = true;
  }

  return DEFAULT_DEV_ACCESS_TOKEN_SECRET;
}

function signAccessToken(payload: AccessTokenPayload): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', getAccessTokenSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function getAccessTokenTtlMs(): number {
  const raw = Number(process.env.AUTH_ACCESS_TOKEN_TTL_MINUTES ?? DEFAULT_ACCESS_TOKEN_TTL_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw * 60_000 : DEFAULT_ACCESS_TOKEN_TTL_MINUTES * 60_000;
}

export function getRefreshTokenTtlMs(): number {
  const raw = Number(process.env.AUTH_REFRESH_TOKEN_TTL_DAYS ?? DEFAULT_REFRESH_TOKEN_TTL_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw * 24 * 60 * 60_000 : DEFAULT_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000;
}

export function getRefreshCookieName(): string {
  return process.env.AUTH_REFRESH_COOKIE_NAME?.trim() || DEFAULT_REFRESH_COOKIE_NAME;
}

function shouldUseSecureCookie(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, salt, hashHex] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createAccessTokenSession(employee: AuthenticatedEmployee): { accessToken: string; expiresAt: string } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + Math.floor(getAccessTokenTtlMs() / 1000);

  return {
    accessToken: signAccessToken({
      sub: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      aud: ACCESS_TOKEN_AUDIENCE,
      type: ACCESS_TOKEN_TYPE,
      iat: issuedAt,
      exp: expiresAt,
    }),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  if (!header || !body || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', getAccessTokenSecret()).update(`${header}.${body}`).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as AccessTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== ACCESS_TOKEN_AUDIENCE || payload.type !== ACCESS_TOKEN_TYPE || payload.exp <= now) {
      return null;
    }
    return payload;
  } catch (_error) {
    return null;
  }
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, item) => {
    const [name, ...rest] = item.trim().split('=');
    if (!name || rest.length === 0) {
      return acc;
    }

    const value = rest.join('=');
    try {
      acc[name] = decodeURIComponent(value);
    } catch (_error) {
      acc[name] = value;
    }
    return acc;
  }, {});
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  const path = options.path ?? '/';
  parts.push(`Path=${path}`);

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  parts.push(shouldUseSecureCookie() ? 'Secure' : '');
  parts.push(`SameSite=${shouldUseSecureCookie() ? 'None' : 'Lax'}`);

  if (options.maxAgeMs !== undefined) {
    const maxAgeSeconds = Math.max(0, Math.floor(options.maxAgeMs / 1000));
    parts.push(`Max-Age=${maxAgeSeconds}`);
    parts.push(`Expires=${new Date(Date.now() + Math.max(0, options.maxAgeMs)).toUTCString()}`);
  }

  return parts.filter(Boolean).join('; ');
}

export function createRefreshTokenCookie(token: string, maxAgeMs: number): string {
  return serializeCookie(getRefreshCookieName(), token, {
    httpOnly: true,
    maxAgeMs,
  });
}

export function clearRefreshTokenCookie(): string {
  return serializeCookie(getRefreshCookieName(), '', {
    httpOnly: true,
    maxAgeMs: 0,
  });
}
