import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface WorkerEnv {
  databaseUrl: string;
  naverAuthStatePath: string;
  naverCafeBoardUrl: string;
  naverCafeId: string;
  naverCafeMenuId: string;
  cafePollIntervalMs: number;
  openAiApiKey: string;
  gmailUser: string;
  gmailAppPassword: string;
  mailFrom: string;
  mailProvider: string;
  artifactBasePath: string;
}

let loaded = false;
let cachedEnv: WorkerEnv | null = null;

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = readFileSync(filePath, 'utf8');
  return raw.split(/\r?\n/).reduce<Record<string, string>>((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return acc;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) {
      return acc;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    acc[key] = value;
    return acc;
  }, {});
}

function loadEnvFile(): void {
  if (loaded) {
    return;
  }

  const root = process.cwd();
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(root, fileName);
    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  loaded = true;
}

function getRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function getNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

export function resolveFromRoot(relativeOrAbsolutePath: string): string {
  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return relativeOrAbsolutePath;
  }
  return path.join(process.cwd(), relativeOrAbsolutePath);
}

export function getWorkerEnv(): WorkerEnv {
  loadEnvFile();
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    databaseUrl: getRequired('DATABASE_URL'),
    naverAuthStatePath: resolveFromRoot(getOptional('NAVER_AUTH_STATE_PATH', 'secrets/naver-auth.json')),
    naverCafeBoardUrl: getRequired('NAVER_CAFE_BOARD_URL'),
    naverCafeId: getRequired('NAVER_CAFE_ID'),
    naverCafeMenuId: getRequired('NAVER_CAFE_MENU_ID'),
    cafePollIntervalMs: getNumber('CAFE_POLL_INTERVAL_MS', 180_000),
    openAiApiKey: getRequired('OPENAI_API_KEY'),
    gmailUser: getRequired('GMAIL_USER'),
    gmailAppPassword: getRequired('GMAIL_APP_PASSWORD'),
    mailFrom: getRequired('MAIL_FROM'),
    mailProvider: getOptional('MAIL_PROVIDER', 'gmail'),
    artifactBasePath: resolveFromRoot(getOptional('ARTIFACT_BASE_PATH', 'tmp/artifacts')),
  };

  process.env.DATABASE_URL = cachedEnv.databaseUrl;
  return cachedEnv;
}
