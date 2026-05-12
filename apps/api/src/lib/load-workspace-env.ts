import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

let workspaceRootCache: string | null = null;
let loaded = false;

function findWorkspaceRoot(startDir: string): string {
  if (workspaceRootCache) {
    return workspaceRootCache;
  }

  let currentDir = startDir;
  while (true) {
    if (existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      workspaceRootCache = currentDir;
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      workspaceRootCache = startDir;
      return startDir;
    }
    currentDir = parentDir;
  }
}

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

/**
 * 워크스페이스 루트의 `.env`, `.env.local`을 읽어 process.env에 반영합니다.
 * 파일에 정의된 키는 기존 환경 변수를 덮어씁니다(.env 다음 `.env.local`이 우선).
 * workers의 getWorkerEnv와 달리, 로컬에서 루트 `.env`만 수정해도 API가 동일 설정을 쓰도록 합니다.
 */
export function loadWorkspaceEnv(): void {
  if (loaded) {
    return;
  }

  const root = findWorkspaceRoot(process.cwd());
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(root, fileName);
    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }
  }

  loaded = true;
}
