/**
 * 숙소 DB 마이그레이션 스크립트
 *
 * 노션에서 내보낸 CSV 파일과 HTML 파일을 파싱하여 Accommodation + AccommodationOption 레코드를 DB에 저장합니다.
 * 이미지는 Notion S3 URL에서 다운로드 후 자체 S3에 재업로드합니다.
 *
 * 실행 방법 (프로젝트 루트에서):
 *   ACCOMMODATION_DB_PATH="/Users/luke/Documents/리더스/디비/숙소 db" \
 *   DATABASE_URL="mysql://..." \
 *   AWS_REGION="ap-northeast-2" \
 *   S3_BUCKET="leaders-tech-bucket" \
 *   AWS_ACCESS_KEY_ID="..." \
 *   AWS_SECRET_ACCESS_KEY="..." \
 *   S3_KEY_PREFIX="korea-erp/dev" \
 *   pnpm --filter @tour/prisma exec tsx prisma/migrate-accommodations.ts
 */

import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── CSV 파싱 ─────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

interface CsvRow {
  name: string;
  priceOffSeason: string;
  pricePeakSeason: string;
  closingDate: string;
  openingDate: string;
  paymentMethod: string;
  mealCostPerServing: string;
  level: string;
  roomType: string;
  facilities: string;
  imagePaths: string;
  parentRef: string;
  destination: string;
  capacity: string;
  mealIncluded: string;
  bookingPriority: string;
  bookingMethod: string;
  phone: string;
  googleMapsUrl: string;
  region: string;
  note: string;
  childrenRef: string;
}

function parseCSV(csvPath: string): { parents: CsvRow[]; children: CsvRow[] } {
  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.split('\n').filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]);

  const get = (cols: string[], h: string) => (cols[headers.indexOf(h)] ?? '').trim();

  const parents: CsvRow[] = [];
  const children: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const row: CsvRow = {
      name: get(cols, '이름'),
      priceOffSeason: get(cols, '1박 가격 (비수기)'),
      pricePeakSeason: get(cols, '1박 가격(성수기)'),
      closingDate: get(cols, '2026 마감일'),
      openingDate: get(cols, '2026년 오픈일'),
      paymentMethod: get(cols, '결제 방식'),
      mealCostPerServing: get(cols, '끼니 당 비용'),
      level: get(cols, '레벨'),
      roomType: get(cols, '룸 형태'),
      facilities: get(cols, '부대시설'),
      imagePaths: get(cols, '사진(내,외부, 식당, 전경 등)'),
      parentRef: get(cols, '상위 항목'),
      destination: get(cols, '여행지'),
      capacity: get(cols, '수용 인원'),
      mealIncluded: get(cols, '식사 포함 유무'),
      bookingPriority: get(cols, '예약 우선순위'),
      bookingMethod: get(cols, '예약방식'),
      phone: get(cols, '전화번호'),
      googleMapsUrl: get(cols, '주소(구글맵 링크)'),
      region: get(cols, '지역'),
      note: get(cols, '특이사항'),
      childrenRef: get(cols, '하위 항목'),
    };

    if (!row.name) continue;

    if (row.childrenRef && !row.parentRef) {
      parents.push(row);
    } else if (row.parentRef) {
      children.push(row);
    }
  }

  // 같은 이름+지역의 중복 부모 제거 (Notion에서 동일 숙소가 두 번 등장하는 케이스 방어)
  const seen = new Set<string>();
  const dedupedParents = parents.filter((p) => {
    const key = `${p.name}|${p.region}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { parents: dedupedParents, children };
}

// ─── HTML 파싱: 이미지 상대경로 → Notion S3 URL 매핑 ─────────────────────────

function buildImageMap(htmlPath: string): Map<string, string> {
  process.stdout.write('🔍 HTML 파싱 중 (이미지 URL 추출)...\n');
  const html = readFileSync(htmlPath, 'utf-8');

  // 각 숙소 블록에서 이미지를 파악하기 위해
  // Notion HTML: toggle block 내 이미지 src는 S3 서명 URL
  // CSV의 imagePaths는 URL-encoded 상대경로 e.g. "%EC%88%99%EC%86%8C/%EC%88%99%EC%86%8CDB/Camp/IMG.jpg"
  // 파일명을 키로 매핑합니다

  const fileNameToUrl = new Map<string, string>();
  const srcMatches = [...html.matchAll(/src="(https:\/\/prod-files-secure[^"]+)"/g)];

  for (const m of srcMatches) {
    const url = m[1];
    // URL에서 파일명 추출 (마지막 / 이후, ? 이전)
    const pathPart = url.split('?')[0];
    const fileName = pathPart.split('/').pop() ?? '';
    if (fileName) {
      fileNameToUrl.set(fileName, url);
    }
  }

  process.stdout.write(`  → 총 ${fileNameToUrl.size}개 이미지 URL 추출\n`);
  return fileNameToUrl;
}

function resolveImageUrls(imagePaths: string, fileNameToUrl: Map<string, string>): string[] {
  if (!imagePaths) return [];
  const paths = imagePaths
    .split(',')
    .map((p) => decodeURIComponent(p.trim()))
    .filter(Boolean);

  return paths
    .map((p) => {
      const fileName = p.split('/').pop() ?? '';
      return fileNameToUrl.get(fileName) ?? null;
    })
    .filter((u): u is string => u !== null);
}

// ─── enum 매핑 ────────────────────────────────────────────────────────────────

function mapLevel(raw: string): 'LV2' | 'LV3' | 'LV4' | 'LV5' {
  if (raw === 'LV.2') return 'LV2';
  if (raw === 'LV.3') return 'LV3';
  if (raw === 'LV.4') return 'LV4';
  if (raw === 'LV.5') return 'LV5';
  return 'LV3';
}

function mapPaymentMethod(raw: string): 'PER_PERSON' | 'PER_ROOM' | null {
  if (raw.includes('인당')) return 'PER_PERSON';
  if (raw.includes('객실') || raw.includes('방')) return 'PER_ROOM';
  return null;
}

function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').replace(/[^0-9]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function mapPriority(raw: string): string | null {
  if (!raw) return null;
  return raw.trim() || null;
}

// ─── S3 업로드 ────────────────────────────────────────────────────────────────

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

async function downloadBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`다운로드 실패 (${response.status}): ${url.slice(0, 100)}`);
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

function extFromContentType(contentType: string, fallbackUrl: string): string {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('webp')) return '.webp';
  // fallback: URL 파일명에서
  const urlPath = fallbackUrl.split('?')[0];
  const ext = extname(urlPath).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return ext;
  return '.jpeg';
}

async function uploadToS3(
  buffer: Buffer,
  contentType: string,
  s3KeySuffix: string,
): Promise<string> {
  const region = process.env.AWS_REGION ?? '';
  const bucket = process.env.S3_BUCKET ?? '';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const keyPrefix = process.env.S3_KEY_PREFIX ? `${process.env.S3_KEY_PREFIX}/` : '';

  const key = `${keyPrefix}accommodations/${s3KeySuffix}`;
  const encodedKey = encodeS3Key(key);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const endpoint = `https://${host}/${encodedKey}`;

  const date = new Date();
  const amzDate = toAmzDate(date);
  const shortDate = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(buffer);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
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
    body: new Uint8Array(buffer),
    headers: {
      'content-type': contentType,
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

async function downloadAndUpload(
  notionUrls: string[],
  accommodationName: string,
  optionRoomType: string,
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < notionUrls.length; i++) {
    const url = notionUrls[i];
    try {
      const { buffer, contentType } = await downloadBuffer(url);
      const ext = extFromContentType(contentType, url);
      // 파일명 추출 (Notion URL 경로의 마지막 세그먼트)
      const originalName = url.split('?')[0].split('/').pop() ?? `img_${i + 1}`;
      const s3Key = `${accommodationName}/${optionRoomType}/${originalName}${ext === extname(originalName).toLowerCase() ? '' : ext}`;
      const uploadedUrl = await uploadToS3(buffer, contentType, s3Key);
      results.push(uploadedUrl);
    } catch (err) {
      process.stderr.write(`    ⚠️  이미지 업로드 실패 (${i + 1}/${notionUrls.length}): ${err}\n`);
    }
  }

  return results;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const dbPath =
    process.env.ACCOMMODATION_DB_PATH ?? '/Users/luke/Documents/리더스/디비/숙소 db';
  const csvPath = `${dbPath}/숙소/숙소DB 2a1aa51063d8808e914ae91e9ec19378.csv`;
  const htmlPath = `${dbPath}/숙소 248aa51063d880238a1eca143652ed6b.html`;

  const uploadEnabled =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_REGION &&
    !!process.env.S3_BUCKET;

  if (!uploadEnabled) {
    process.stdout.write('⚠️  S3 환경변수 미설정 → 이미지 업로드 스킵 (Notion URL 그대로 저장)\n\n');
  }

  process.stdout.write(`📄 CSV 파싱 중: ${csvPath}\n`);
  const { parents, children } = parseCSV(csvPath);
  process.stdout.write(`✅ 부모: ${parents.length}개 / 자식(옵션): ${children.length}개\n\n`);

  const fileNameToUrl = buildImageMap(htmlPath);

  // 부모 이름 → 자식 목록 매핑
  const childrenByParent = new Map<string, CsvRow[]>();
  for (const child of children) {
    // parentRef 형태: "부모이름 (https://...)" 또는 "부모이름 (설명) (https://...)"
    // URL 부분만 제거하고 나머지를 부모이름으로 사용
    const parentName = child.parentRef.replace(/\s*\(https?:\/\/[^)]+\)\s*$/g, '').trim();
    const list = childrenByParent.get(parentName) ?? [];
    list.push(child);
    childrenByParent.set(parentName, list);
  }

  let accSuccess = 0;
  let optSuccess = 0;
  let errorCount = 0;

  for (const parent of parents) {
    process.stdout.write(`🏠 ${parent.name} (${parent.region} / ${parent.destination})\n`);

    // Accommodation upsert
    let accommodation: { id: string } | null = null;
    try {
      const existing = await prisma.accommodation.findFirst({
        where: { name: parent.name, region: parent.region },
      });
      if (existing) {
        accommodation = await prisma.accommodation.update({
          where: { id: existing.id },
          data: { destination: parent.destination, region: parent.region },
        });
        process.stdout.write(`  ♻️  숙소 업데이트\n`);
      } else {
        accommodation = await prisma.accommodation.create({
          data: { name: parent.name, destination: parent.destination, region: parent.region },
        });
        process.stdout.write(`  ✅ 숙소 생성\n`);
      }
      accSuccess++;
    } catch (err) {
      process.stderr.write(`  ❌ 숙소 저장 실패: ${err}\n`);
      errorCount++;
      continue;
    }

    // 자식 옵션들 처리
    const opts = childrenByParent.get(parent.name) ?? [];
    if (opts.length === 0) {
      process.stdout.write(`  ℹ️  옵션 없음\n`);
    }

    // 기존 옵션 전체 삭제 후 재생성 (동일 roomType 중복으로 인한 손실 방지)
    try {
      const deleted = await prisma.accommodationOption.deleteMany({
        where: { accommodationId: accommodation.id },
      });
      if (deleted.count > 0) {
        process.stdout.write(`  🗑️  기존 옵션 ${deleted.count}개 삭제\n`);
      }
    } catch (err) {
      process.stderr.write(`  ❌ 기존 옵션 삭제 실패: ${err}\n`);
    }

    for (let optIdx = 0; optIdx < opts.length; optIdx++) {
      const opt = opts[optIdx];
      const roomType = opt.roomType || '기타';
      const notionUrls = resolveImageUrls(opt.imagePaths, fileNameToUrl);
      process.stdout.write(`  📦 옵션 ${optIdx + 1}/${opts.length}: ${roomType} (이미지 ${notionUrls.length}개)\n`);

      let imageUrls: string[] = [];
      if (uploadEnabled && notionUrls.length > 0) {
        imageUrls = await downloadAndUpload(notionUrls, parent.name, roomType);
        process.stdout.write(`    🖼️  ${imageUrls.length}/${notionUrls.length}개 업로드 완료\n`);
      } else if (!uploadEnabled && notionUrls.length > 0) {
        // S3 업로드 없이 Notion URL 그대로 저장
        imageUrls = notionUrls;
      }

      const optData = {
        accommodationId: accommodation.id,
        roomType,
        level: mapLevel(opt.level),
        priceOffSeason: parsePrice(opt.priceOffSeason),
        pricePeakSeason: parsePrice(opt.pricePeakSeason),
        paymentMethod: mapPaymentMethod(opt.paymentMethod),
        mealCostPerServing: parsePrice(opt.mealCostPerServing),
        capacity: opt.capacity || null,
        mealIncluded: opt.mealIncluded === '포함',
        facilities: opt.facilities || null,
        bookingPriority: mapPriority(opt.bookingPriority),
        bookingMethod: opt.bookingMethod || null,
        phone: opt.phone || null,
        googleMapsUrl: opt.googleMapsUrl || null,
        openingDate: opt.openingDate || null,
        closingDate: opt.closingDate || null,
        imageUrls,
        note: opt.note || null,
      };

      try {
        await prisma.accommodationOption.create({ data: optData });
        optSuccess++;
      } catch (err) {
        process.stderr.write(`    ❌ 옵션 저장 실패 (${roomType}): ${err}\n`);
        errorCount++;
      }
    }
  }

  process.stdout.write(`\n${'─'.repeat(40)}\n`);
  process.stdout.write(`✅ 숙소: ${accSuccess} / 옵션: ${optSuccess} / ❌ 실패: ${errorCount}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
