/**
 * 유저 첨부파일 마이그레이션 스크립트
 * 노션 user3 db → User.attachments (S3 업로드 후 URL 저장)
 *
 * 실행:
 *   npx tsx prisma/migrate-user-attachments.ts
 *
 * PRD:
 *   DATABASE_URL="mysql://admin:..." S3_KEY_PREFIX="korea-erp/prd" npx tsx prisma/migrate-user-attachments.ts
 */

import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── 상수 ────────────────────────────────────────────────────────────────────

const USER3_DB_PATH = '/Users/luke/Documents/리더스/디비/user3 db';
const SUBPAGE_DIR = join(USER3_DB_PATH, '페이지', '예약표 (1)');
const TOUR_LIST_HTML = '/Users/luke/Documents/리더스/디비/user db/투어 리스트 104aa51063d880f5b6b9c6304d66fa6d.html';

/** S3 병렬 업로드 동시성 */
const CONCURRENCY = 5;

// ─── S3 유틸 ─────────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodeS3Key(value: string): string {
  return value
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/** 파일명의 특수문자(괄호, 공백 등)를 S3 키에 안전한 형태로 치환 */
function sanitizeFilenameForS3(filename: string): string {
  const ext = filename.lastIndexOf('.');
  const base = ext >= 0 ? filename.slice(0, ext) : filename;
  const extension = ext >= 0 ? filename.slice(ext) : '';
  const safeBase = base
    .replace(/[()' \[\]{}#%&+,;=?@]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return safeBase + extension;
}

async function uploadToS3(filePath: string, s3KeySuffix: string): Promise<string> {
  const region = process.env.AWS_REGION ?? '';
  const bucket = process.env.S3_BUCKET ?? '';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const keyPrefix = process.env.S3_KEY_PREFIX ? `${process.env.S3_KEY_PREFIX}/` : '';

  const rawBuffer = await readFile(filePath);
  const ext = extname(filePath).toLowerCase();
  const mime = MIME_MAP[ext] ?? 'application/octet-stream';

  const key = `${keyPrefix}user-attachments/${s3KeySuffix}`;
  const encodedKey = encodeS3Key(key);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}/${encodedKey}`;

  const date = new Date();
  const amzDate = toAmzDate(date);
  const shortDate = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(rawBuffer);

  const canonicalHeaders = `content-type:${mime}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', `/${encodedKey}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${shortDate}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${secretAccessKey}`, shortDate);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const signingKey = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    body: new Uint8Array(rawBuffer),
    headers: {
      'content-type': mime,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`S3 업로드 실패 (${response.status}): ${body.slice(0, 200)}`);
  }

  if (publicBaseUrl) {
    const base = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
    return `${base}/${encodedKey}`;
  }
  return endpoint;
}

// ─── HTML 파싱 ────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { normalize } from 'node:path';

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u200D\u20E3\u2640\u2642]+/gu, '')
    .trim();
}

function parseName(raw: string): string {
  let n = stripEmoji(raw);
  n = n.replace(/\([^)]*\)/g, '').trim();
  return n.normalize('NFC');
}

/** 투어 리스트 96명 이름 추출 */
function extractTourNames(htmlPath: string): string[] {
  const html = readFileSync(htmlPath, 'utf-8');
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return [];
  const rows = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  return rows
    .map((m) => {
      const tds = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
      if (!tds[0]) return null;
      return parseName(stripTags(tds[0][1]));
    })
    .filter((n): n is string => !!n);
}

interface Attachment {
  filename: string;
  url: string;
  type: 'pdf' | 'image';
}

// ─── 병렬 실행 헬퍼 ──────────────────────────────────────────────────────────

async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        const result = await tasks[i]!();
        results[i] = { status: 'fulfilled', value: result };
      } catch (e) {
        results[i] = { status: 'rejected', reason: e };
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  const uploadEnabled =
    !!process.env.AWS_REGION &&
    !!process.env.S3_BUCKET &&
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY;

  console.log(`S3 업로드: ${uploadEnabled ? '활성화' : '비활성화 (URL 생성 스킵)'}`);

  // 1) 투어 리스트 96명 이름 추출
  const tourNames = extractTourNames(TOUR_LIST_HTML);
  console.log(`투어 리스트 인원: ${tourNames.length}명`);

  // 2) user3 폴더와 매칭
  let subdirItems: string[] = [];
  try {
    subdirItems = readdirSync(SUBPAGE_DIR);
  } catch {
    throw new Error(`폴더를 찾을 수 없습니다: ${SUBPAGE_DIR}`);
  }

  const folderMap = new Map<string, string>();
  for (const item of subdirItems) {
    const fullPath = join(SUBPAGE_DIR, item);
    try {
      const stat = await import('node:fs').then(m => m.statSync(fullPath));
      if (stat.isDirectory()) {
        folderMap.set(item.normalize('NFC'), item);
      }
    } catch { /* skip */ }
  }

  const matched: Array<{ name: string; folder: string; files: string[] }> = [];
  const unmatched: string[] = [];

  for (const name of tourNames) {
    const folderName = folderMap.get(name);
    if (!folderName) {
      unmatched.push(name);
      continue;
    }
    const folderPath = join(SUBPAGE_DIR, folderName);
    const files = readdirSync(folderPath);
    matched.push({ name, folder: folderPath, files });
  }

  console.log(`매칭 성공: ${matched.length}명 | 미매칭: ${unmatched.length}명`);
  if (unmatched.length) {
    console.log(`  미매칭: ${unmatched.join(', ')}`);
  }

  // 3) DB에서 User 조회 (name 기준)
  const matchedNames = matched.map((m) => m.name);
  const users = await prisma.user.findMany({
    where: { name: { in: matchedNames } },
    select: { id: true, name: true },
  });

  const userMap = new Map<string, string>();
  for (const u of users) {
    userMap.set(u.name, u.id);
  }

  console.log(`DB 유저 매칭: ${userMap.size}명`);

  // 4) 파일별 S3 업로드 작업 생성
  type UploadTask = {
    name: string;
    userId: string;
    filePath: string;
    filename: string;
    type: 'pdf' | 'image';
  };

  const tasks: UploadTask[] = [];
  for (const { name, folder, files } of matched) {
    const userId = userMap.get(name);
    if (!userId) {
      console.warn(`  ⚠️  DB 유저 없음: ${name}`);
      continue;
    }
    for (const filename of files) {
      const ext = extname(filename).toLowerCase();
      const isPdf = ext === '.pdf';
      const isImg = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      if (!isPdf && !isImg) continue;
      tasks.push({
        name,
        userId,
        filePath: join(folder, filename),
        filename,
        type: isPdf ? 'pdf' : 'image',
      });
    }
  }

  console.log(`\n업로드 대상: ${tasks.length}개 파일`);

  // 5) 병렬 업로드
  const userAttachments = new Map<string, Attachment[]>();
  for (const { name, userId } of matched) {
    if (userMap.has(name)) userAttachments.set(userId!, []);
  }

  const uploadTasks = tasks.map((task) => async () => {
    const { name, userId, filePath, filename, type } = task;
    let url = '';

    if (uploadEnabled) {
      const safeFilename = sanitizeFilenameForS3(filename);
      const s3Key = `${userId}/${safeFilename}`;
      try {
        url = await uploadToS3(filePath, s3Key);
        console.log(`  ✓ ${name}/${filename}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message.slice(0, 120) : String(e);
        console.error(`  ✗ ${name}/${filename}: ${msg}`);
        throw e;
      }
    } else {
      console.log(`  (skip) ${name}/${filename}`);
    }

    const arr = userAttachments.get(userId) ?? [];
    arr.push({ filename, url, type });
    userAttachments.set(userId, arr);
    return url;
  });

  const results = await pLimit(uploadTasks, CONCURRENCY);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.error(`\n업로드 실패 ${failed.length}건:`);
    for (const f of failed) {
      if (f.status === 'rejected') console.error(' ', f.reason);
    }
  }

  // 6) DB 업데이트
  console.log('\nDB 업데이트 중...');
  let updatedCount = 0;
  for (const [userId, attachments] of userAttachments.entries()) {
    if (attachments.length === 0) continue;
    await prisma.user.update({
      where: { id: userId },
      data: { attachments: attachments as never },
    });
    updatedCount++;
  }

  console.log('\n=== 완료 ===');
  console.log(`업로드 성공: ${results.filter((r) => r.status === 'fulfilled').length}개`);
  console.log(`업로드 실패: ${failed.length}개`);
  console.log(`DB 업데이트: ${updatedCount}명`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
