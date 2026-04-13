/**
 * 기사 DB 마이그레이션 스크립트
 *
 * 노션에서 내보낸 HTML 파일(기사 DB)을 파싱하여 Driver 레코드를 DB에 저장합니다.
 * 프로필 사진과 차량 이미지는 S3에 업로드한 뒤 URL을 매핑합니다.
 *
 * 실행 방법 (프로젝트 루트에서):
 *   DRIVER_DB_PATH="/Users/luke/Documents/리더스/디비/기사 db" \
 *   DATABASE_URL="mysql://root2:root2@LUKE-MAC.local:3306/leaders-db" \
 *   AWS_REGION="ap-northeast-2" \
 *   S3_BUCKET="leaders-tech-bucket" \
 *   AWS_ACCESS_KEY_ID="..." \
 *   AWS_SECRET_ACCESS_KEY="..." \
 *   S3_KEY_PREFIX="korea-erp/dev" \
 *   pnpm --filter @tour/prisma exec tsx prisma/migrate-drivers.ts
 */

import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── HTML 파싱 ────────────────────────────────────────────────────────────────

function clean(s: string): string {
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<div class="checkbox checkbox-on"><\/div>/g, 'Y');
  s = s.replace(/<div class="checkbox checkbox-off"><\/div>/g, 'N');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
  return s.replace(/\s+/g, ' ').trim();
}

interface ParsedDriver {
  nameMn: string;
  vehicleTypeRaw: string;
  vehicleNumber: string;
  vehicleOptions: string;
  vehicleYearRaw: string;
  maxPassengersRaw: string;
  level: string;
  status: string;
  gender: string;
  birthYearRaw: string;
  isSmokerRaw: string;
  hasTouristLicenseRaw: string;
  joinYearRaw: string;
  phone: string;
  note: string;
  profileImgSrc: string | null;
  vehicleImgSrcs: string[];
}

function parseHtml(htmlPath: string): ParsedDriver[] {
  const text = readFileSync(htmlPath, 'utf-8');
  const m = text.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead><tbody>([\s\S]*?)<\/tbody>/);
  if (!m) throw new Error('테이블을 찾을 수 없습니다.');
  const [, headHtml, bodyHtml] = m;

  const headers = (headHtml.match(/<th>([\s\S]*?)<\/th>/g) ?? []).map((h) =>
    clean(h.replace(/<\/?th>/g, '')),
  );

  const rows = bodyHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  process.stdout.write(`헤더: ${JSON.stringify(headers)}\n`);
  process.stdout.write(`총 행 수: ${rows.length}\n`);

  const drivers: ParsedDriver[] = [];

  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? []).map((c) =>
      c.replace(/<\/?td[^>]*>/g, ''),
    );

    const get = (col: string) => clean(cells[headers.indexOf(col)] ?? '');

    const profileCell = cells[headers.indexOf('프로필사진')] ?? '';
    const vehicleCell = cells[headers.indexOf('차량사진(내/ 외부) (1)')] ?? '';

    const profileImgMatch = profileCell.match(/src="([^"]+)"/);
    const vehicleImgMatches = [...vehicleCell.matchAll(/src="([^"]+)"/g)];

    const decodeSrc = (s: string) => decodeURIComponent(s);

    drivers.push({
      nameMn: get('몽골 이름'),
      vehicleTypeRaw: get('차종'),
      vehicleNumber: get('차량번호'),
      vehicleOptions: get('차량옵션'),
      vehicleYearRaw: get('차량 연식'),
      maxPassengersRaw: get('최대탑승인원'),
      level: get('기사 레벨'),
      status: get('상태'),
      gender: get('성별'),
      birthYearRaw: get('출생년도'),
      isSmokerRaw: get('흡연 여부'),
      hasTouristLicenseRaw: get('Tourist 허가'),
      joinYearRaw: get('입사 연도'),
      phone: get('전화번호'),
      note: get('특이사항'),
      profileImgSrc: profileImgMatch ? decodeSrc(profileImgMatch[1]) : null,
      vehicleImgSrcs: vehicleImgMatches.map((m2) => decodeSrc(m2[1])),
    });
  }

  return drivers.filter((d) => d.nameMn.length > 0);
}

// ─── enum 매핑 ────────────────────────────────────────────────────────────────

function mapVehicleType(raw: string): 'STAREX' | 'HIACE' | 'PURGON' | 'LAND_CRUISER' | 'ALPHARD' | 'OTHER' {
  const v = raw.toLowerCase();
  if (v.includes('스타렉스') || v.includes('starex')) return 'STAREX';
  if (v.includes('하이에이스') || v.includes('hiace')) return 'HIACE';
  if (v.includes('푸르공') || v.includes('purgon')) return 'PURGON';
  if (v.includes('랜드크루저') || v.includes('land')) return 'LAND_CRUISER';
  if (v.includes('알파드') || v.includes('alphard')) return 'ALPHARD';
  return 'OTHER';
}

function mapLevel(raw: string): 'MAIN' | 'JUNIOR' | 'ROOKIE' | 'OTHER' {
  const v = raw.toLowerCase();
  if (v.includes('메인') || v.includes('main')) return 'MAIN';
  if (v.includes('주니어') || v.includes('junior')) return 'JUNIOR';
  if (v.includes('신입') || v.includes('rookie')) return 'ROOKIE';
  return 'OTHER';
}

function mapStatus(raw: string): 'ACTIVE_SEASON' | 'INTERVIEW_DONE' | 'BLACKLISTED' | 'OTHER' {
  const v = raw.toLowerCase();
  if (v.includes('시즌') || v.includes('활동') || v.includes('active')) return 'ACTIVE_SEASON';
  if (v.includes('면접') || v.includes('interview')) return 'INTERVIEW_DONE';
  if (v.includes('블랙') || v.includes('black')) return 'BLACKLISTED';
  return 'OTHER';
}

function mapGender(raw: string): 'MALE' | 'FEMALE' | null {
  if (raw === '남' || raw.toLowerCase() === 'm') return 'MALE';
  if (raw === '여' || raw.toLowerCase() === 'f') return 'FEMALE';
  return null;
}

function parseBirthYear(raw: string): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2,4})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 100) return 1900 + n;
  return n;
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  const m = raw.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// ─── S3 업로드 ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
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

  const key = `${keyPrefix}drivers/${s3KeySuffix}`;
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

// ─── 이미지 파일 탐색 ─────────────────────────────────────────────────────────

function findImageFile(driverDbPath: string, imgSrc: string): string | null {
  const candidate = join(driverDbPath, imgSrc);
  if (existsSync(candidate)) return candidate;
  return null;
}

function findImageByDriverFolder(driverDbPath: string, nameMn: string): string | null {
  const folderBase = join(driverDbPath, '기사', '기사 개인정보');
  try {
    const entries = readdirSync(folderBase);
    // 1순위: 정확히 일치
    let match = entries.find((e) => e === nameMn);
    // 2순위: 폴더명이 nameMn을 포함
    if (!match) match = entries.find((e) => e.includes(nameMn));
    // 3순위: nameMn이 폴더명(공백 전 첫 단어)과 일치 (3글자 이상만)
    if (!match) {
      match = entries.find((e) => {
        const first = e.split(' ')[0];
        return first.length >= 3 && nameMn === first;
      });
    }
    if (!match) return null;
    const folder = join(folderBase, match);
    const files = readdirSync(folder).filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
    return files.length > 0 ? join(folder, files[0]) : null;
  } catch {
    return null;
  }
}

function findVehicleImages(driverDbPath: string, imgSrcs: string[]): string[] {
  return imgSrcs
    .map((src) => findImageFile(driverDbPath, src))
    .filter((p): p is string => p !== null);
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const driverDbPath =
    process.env.DRIVER_DB_PATH ?? '/Users/luke/Documents/리더스/디비/기사 db';
  const htmlPath = join(driverDbPath, '기사 2a1aa51063d88056bd8efc0c5e5cb791.html');

  process.stdout.write(`\n📄 HTML 파싱 중: ${htmlPath}\n`);
  const drivers = parseHtml(htmlPath);
  process.stdout.write(`✅ 총 ${drivers.length}명 파싱 완료\n\n`);

  const uploadEnabled =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_REGION &&
    !!process.env.S3_BUCKET;

  if (!uploadEnabled) {
    process.stdout.write('⚠️  S3 환경변수 미설정 → 이미지 업로드 스킵\n\n');
  }

  let successCount = 0;
  let errorCount = 0;

  for (const d of drivers) {
    process.stdout.write(`🚗 ${d.nameMn}\n`);

    let profileImageUrl: string | null = null;
    const vehicleImageUrls: string[] = [];

    if (uploadEnabled) {
      // 프로필 사진
      const profilePath = d.profileImgSrc
        ? findImageFile(driverDbPath, d.profileImgSrc)
        : findImageByDriverFolder(driverDbPath, d.nameMn);

      if (profilePath) {
        try {
          const ext = extname(profilePath).toLowerCase();
          profileImageUrl = await uploadToS3(profilePath, `${d.nameMn}/profile${ext}`);
          process.stdout.write(`  📷 프로필: ${profileImageUrl}\n`);
        } catch (err) {
          process.stderr.write(`  ❌ 프로필 업로드 실패: ${err}\n`);
        }
      } else {
        process.stdout.write(`  ℹ️  프로필 이미지 없음\n`);
      }

      // 차량 사진 (다수)
      const vehiclePaths = findVehicleImages(driverDbPath, d.vehicleImgSrcs);
      for (let i = 0; i < vehiclePaths.length; i++) {
        try {
          const ext = extname(vehiclePaths[i]).toLowerCase();
          const url = await uploadToS3(vehiclePaths[i], `${d.nameMn}/vehicle_${i + 1}${ext}`);
          vehicleImageUrls.push(url);
          process.stdout.write(`  🚙 차량사진 ${i + 1}: ${url}\n`);
        } catch (err) {
          process.stderr.write(`  ❌ 차량사진 업로드 실패: ${err}\n`);
        }
      }
      if (vehiclePaths.length === 0 && d.vehicleImgSrcs.length > 0) {
        process.stdout.write(`  ℹ️  차량사진 파일 없음 (${d.vehicleImgSrcs.length}개 참조)\n`);
      }
    }

    const data = {
      nameMn: d.nameMn,
      vehicleType: mapVehicleType(d.vehicleTypeRaw),
      vehicleNumber: d.vehicleNumber || null,
      vehicleOptions: d.vehicleOptions || null,
      vehicleYear: parseNumber(d.vehicleYearRaw),
      maxPassengers: parseNumber(d.maxPassengersRaw),
      level: mapLevel(d.level),
      status: mapStatus(d.status),
      gender: mapGender(d.gender),
      birthYear: parseBirthYear(d.birthYearRaw),
      isSmoker: d.isSmokerRaw === 'O',
      hasTouristLicense: d.hasTouristLicenseRaw === 'Y',
      joinYear: parseNumber(d.joinYearRaw),
      phone: d.phone || null,
      profileImageUrl,
      vehicleImageUrls,
      note: d.note || null,
    };

    try {
      const existing = await prisma.driver.findFirst({ where: { nameMn: d.nameMn } });
      if (existing) {
        await prisma.driver.update({ where: { id: existing.id }, data });
        process.stdout.write(`  ♻️  업데이트 완료\n`);
      } else {
        await prisma.driver.create({ data });
        process.stdout.write(`  ✅ 생성 완료\n`);
      }
      successCount++;
    } catch (err) {
      process.stderr.write(`  ❌ DB 저장 실패 (${d.nameMn}): ${err}\n`);
      errorCount++;
    }
  }

  process.stdout.write(`\n${'─'.repeat(40)}\n`);
  process.stdout.write(`✅ 성공: ${successCount}  ❌ 실패: ${errorCount}\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
