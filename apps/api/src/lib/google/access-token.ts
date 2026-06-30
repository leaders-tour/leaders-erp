import { createSign } from 'node:crypto';
import { DomainError } from '../errors';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface GoogleAccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function getGooglePrivateKey(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new DomainError('VALIDATION_FAILED', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required');
  }
  return raw.replace(/\\n/g, '\n');
}

export async function getGoogleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!email) {
    throw new DomainError('VALIDATION_FAILED', 'GOOGLE_SERVICE_ACCOUNT_EMAIL is required');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    base64Url(
      JSON.stringify({
        iss: email,
        scope: GOOGLE_SCOPES,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join('.');

  const signature = createSign('RSA-SHA256').update(unsigned).sign(getGooglePrivateKey());
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = (await response.json()) as GoogleAccessTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new DomainError(
      'VALIDATION_FAILED',
      data.error_description ?? data.error ?? 'Failed to fetch Google access token',
    );
  }
  return data.access_token;
}
