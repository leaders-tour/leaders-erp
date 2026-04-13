/**
 * 숙소 이미지 전용 마이그레이션 스크립트 (로컬 파일 방식)
 *
 * - 이미 imageUrls가 있는 옵션은 건너뜁니다.
 * - 노션 ZIP 내보내기 폴더에서 로컬 이미지를 읽어 S3에 업로드합니다.
 * - CSV의 이미지 경로를 기준으로 매핑합니다.
 *
 * 실행:
 *   EXPORT_BASE="/Users/luke/Downloads/Private & Shared 3" \
 *   ACCOMMODATION_DB_PATH="/Users/luke/Documents/리더스/디비/숙소 db" \
 *   DATABASE_URL="mysql://..." \
 *   AWS_REGION="ap-northeast-2" S3_BUCKET="leaders-tech-bucket" \
 *   AWS_ACCESS_KEY_ID="..." AWS_SECRET_ACCESS_KEY="..." \
 *   S3_KEY_PREFIX="korea-erp/prd" \
 *   pnpm --filter @tour/prisma exec tsx prisma/migrate-accommodation-images.ts
 */

import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

// ─── CSV 파싱 ─────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const c of line) {
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += c; }
  }
  result.push(current.trim());
  return result;
}

interface OptionInfo {
  accommodationName: string;
  roomType: string;
  imagePaths: string[];  // 디코딩된 로컬 상대경로 배열
}

function parseCSVForImages(csvPath: string): OptionInfo[] {
  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.split('\n').filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]);

  const get = (cols: string[], h: string) => (cols[headers.indexOf(h)] ?? '').trim();

  const results: OptionInfo[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const parentRef = get(cols, '상위 항목');
    if (!parentRef) continue;

    const accommodationName = parentRef.split(' (')[0].trim();
    const roomType = get(cols, '룸 형태') || '기타';
    const rawPaths = get(cols, '사진(내,외부, 식당, 전경 등)');
    if (!rawPaths) continue;

    const imagePaths = rawPaths
      .split(',')
      .map((p) => decodeURIComponent(p.trim()))
      .filter(Boolean);

    if (imagePaths.length > 0) {
      results.push({ accommodationName, roomType, imagePaths });
    }
  }
  return results;
}

// ─── 로컬 이미지 탐색 ─────────────────────────────────────────────────────────

/**
 * CSV 이미지 경로: `숙소/숙소DB/Camp Name/IMG_7565.jpeg`
 * 로컬 폴더: `{exportBase}/숙소/숙소DB/Camp Name/IMG_7565.jpeg`
 *
 * 단, 노션 내보내기 시 폴더명에 `-{id}` 접미사가 붙는 경우가 있으므로 폴더 매칭도 처리.
 */
function resolveLocalPaths(exportBase: string, csvPaths: string[]): string[] {
  return csvPaths
    .map((relativePath) => {
      // 1순위: 정확한 경로
      const exact = join(exportBase, relativePath);
      if (existsSync(exact)) return exact;

      // 2순위: 폴더명에 -suffix가 붙는 경우 처리
      const parts = relativePath.split('/');
      if (parts.length < 2) return null;

      const baseDir = join(exportBase, ...parts.slice(0, -2));
      const targetFolder = parts[parts.length - 2];
      const fileName = parts[parts.length - 1];

      if (!existsSync(baseDir)) return null;

      let entries: string[];
      try { entries = readdirSync(baseDir); } catch { return null; }

      // 폴더명이 targetFolder로 시작하는 것 (접미사 포함 변형), 숨김파일 제외
      const matchedFolder = entries.find((e) => {
        if (e.startsWith('.')) return false;
        const fullPath = join(baseDir, e);
        try {
          const stat = require('node:fs').statSync(fullPath);
          if (!stat.isDirectory()) return false;
        } catch { return false; }
        return e === targetFolder || e.startsWith(`${targetFolder} `) || e.startsWith(`${targetFolder}_`);
      });

      if (!matchedFolder) return null;
      const candidate = join(baseDir, matchedFolder, fileName);
      return existsSync(candidate) ? candidate : null;
    })
    .filter((p): p is string => p !== null);
}

// ─── S3 업로드 ────────────────────────────────────────────────────────────────

function sha256Hex(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}
function hmacBuf(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}
function toAmzDate(d: Date) {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, '');
}
function encodeS3Key(v: string) {
  return v.split('/').map((s) => encodeURIComponent(s)).join('/');
}

async function uploadToS3(filePath: string, s3KeySuffix: string): Promise<string> {
  const region = process.env.AWS_REGION ?? '';
  const bucket = process.env.S3_BUCKET ?? '';
  const ak = process.env.AWS_ACCESS_KEY_ID ?? '';
  const sk = process.env.AWS_SECRET_ACCESS_KEY ?? '';
  const pubBase = process.env.S3_PUBLIC_BASE_URL;
  const prefix = process.env.S3_KEY_PREFIX ? `${process.env.S3_KEY_PREFIX}/` : '';

  const buffer = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] ?? 'image/jpeg';

  const key = `${prefix}accommodations/${s3KeySuffix}`;
  const encodedKey = encodeS3Key(key);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}/${encodedKey}`;

  const date = new Date();
  const amzDate = toAmzDate(date);
  const shortDate = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(buffer);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const cr = ['PUT', `/${encodedKey}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${shortDate}/${region}/s3/aws4_request`;
  const sts = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(cr)].join('\n');

  const kDate = hmacBuf(`AWS4${sk}`, shortDate);
  const kRegion = hmacBuf(kDate, region);
  const kService = hmacBuf(kRegion, 's3');
  const sig = createHmac('sha256', hmacBuf(kService, 'aws4_request')).update(sts).digest('hex');
  const auth = `AWS4-HMAC-SHA256 Credential=${ak}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;

  const res = await fetch(endpoint, {
    method: 'PUT',
    body: new Uint8Array(buffer),
    headers: {
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: auth,
    },
  });

  if (!res.ok) throw new Error(`S3 ${res.status}: ${(await res.text()).slice(0, 200)}`);

  if (pubBase) {
    const base = pubBase.endsWith('/') ? pubBase.slice(0, -1) : pubBase;
    return `${base}/${encodedKey}`;
  }
  return endpoint;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const exportBase = process.env.EXPORT_BASE ?? '/Users/luke/Downloads/Private & Shared 3';
  const dbPath = process.env.ACCOMMODATION_DB_PATH ?? '/Users/luke/Documents/리더스/디비/숙소 db';
  const csvPath = `${dbPath}/숙소/숙소DB 2a1aa51063d8808e914ae91e9ec19378.csv`;

  // 로컬 이미지 폴더 확인
  const imageBase = join(exportBase, '숙소', '숙소DB');
  if (!existsSync(imageBase)) {
    process.stderr.write(`❌ 이미지 폴더 없음: ${imageBase}\n`);
    process.exit(1);
  }

  process.stdout.write(`📁 이미지 폴더: ${imageBase}\n\n`);

  // DB에서 이미지 없는 옵션 조회
  const allOptions = await (prisma.accommodationOption as unknown as {
    findMany: (args: object) => Promise<Array<{
      id: string;
      accommodationId: string;
      roomType: string;
      imageUrls: unknown;
      accommodation: { name: string };
    }>>;
  }).findMany({
    include: { accommodation: { select: { name: true } } },
  });

  const needsImage = allOptions.filter((o) => {
    const urls = Array.isArray(o.imageUrls) ? o.imageUrls : [];
    return urls.length === 0;
  });

  process.stdout.write(`📊 전체 옵션: ${allOptions.length} / 이미지 필요: ${needsImage.length}\n\n`);

  if (needsImage.length === 0) {
    process.stdout.write('✅ 모든 옵션에 이미지가 이미 있습니다.\n');
    await prisma.$disconnect();
    return;
  }

  // CSV 이미지 경로 맵 구성
  const csvOptions = parseCSVForImages(csvPath);
  // key: "숙소명|룸타입"
  const csvMap = new Map<string, string[]>();
  for (const o of csvOptions) {
    csvMap.set(`${o.accommodationName}|${o.roomType}`, o.imagePaths);
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const opt of needsImage) {
    const accName = opt.accommodation?.name ?? '';
    const csvKey = `${accName}|${opt.roomType}`;

    let csvPaths = csvMap.get(csvKey);

    // 정확 매핑 실패 시 부분 매핑 시도 (같은 숙소의 유사 룸타입)
    if (!csvPaths) {
      const fallbackKey = [...csvMap.keys()].find(
        (k) => k.startsWith(`${accName}|`) && k.toLowerCase().includes(opt.roomType.slice(0, 3).toLowerCase()),
      );
      if (fallbackKey) csvPaths = csvMap.get(fallbackKey);
    }

    if (!csvPaths || csvPaths.length === 0) {
      process.stdout.write(`⏭️  [매핑없음] ${accName} / ${opt.roomType}\n`);
      skipCount++;
      continue;
    }

    const localPaths = resolveLocalPaths(exportBase, csvPaths);

    if (localPaths.length === 0) {
      process.stdout.write(`⏭️  [파일없음] ${accName} / ${opt.roomType} (경로: ${csvPaths[0]?.slice(0, 60)})\n`);
      skipCount++;
      continue;
    }

    process.stdout.write(`📦 ${accName} / ${opt.roomType} (${localPaths.length}개)\n`);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < localPaths.length; i++) {
      const localPath = localPaths[i];
      const fileName = localPath.split('/').pop() ?? `img_${i + 1}`;
      const s3Key = `${accName}/${opt.roomType}/${fileName}`;

      try {
        const url = await uploadToS3(localPath, s3Key);
        uploadedUrls.push(url);
        process.stdout.write(`  ✅ ${i + 1}/${localPaths.length} ${fileName}\n`);
      } catch (err) {
        process.stderr.write(`  ⚠️  ${i + 1}/${localPaths.length} 실패: ${err}\n`);
      }
    }

    if (uploadedUrls.length > 0) {
      try {
        await prisma.accommodationOption.update({
          where: { id: opt.id },
          data: { imageUrls: uploadedUrls },
        });
        successCount++;
      } catch (err) {
        process.stderr.write(`  ❌ DB 갱신 실패: ${err}\n`);
        errorCount++;
      }
    } else {
      errorCount++;
    }
  }

  process.stdout.write(`\n${'─'.repeat(40)}\n`);
  process.stdout.write(`✅ 성공: ${successCount} / ⏭️ 스킵: ${skipCount} / ❌ 실패: ${errorCount}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
