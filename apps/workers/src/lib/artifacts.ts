import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function ensureDirectory(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

export function buildLeadArtifactDir(basePath: string, articleId: string, runId: string): string {
  const dirPath = path.join(basePath, 'cafe', articleId, runId);
  ensureDirectory(dirPath);
  return dirPath;
}

export function writeTextArtifact(dirPath: string, fileName: string, content: string): string {
  ensureDirectory(dirPath);
  const filePath = path.join(dirPath, fileName);
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}
