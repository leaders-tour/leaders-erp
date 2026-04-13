/**
 * 가이드 DB 마이그레이션 스크립트
 *
 * 노션에서 내보낸 HTML 파일(가이드 DB)을 파싱하여 Guide 레코드를 DB에 저장합니다.
 * 프로필 사진과 자격증 이미지는 S3에 업로드한 뒤 URL을 매핑합니다.
 *
 * 실행 방법 (프로젝트 루트에서):
 *   GUIDE_DB_PATH="/Users/luke/Documents/리더스/디비/가이드 db" \
 *   DATABASE_URL="mysql://root2:root2@LUKE-MAC.local:3306/leaders-db" \
 *   AWS_REGION="ap-northeast-2" \
 *   S3_BUCKET="leaders-tech-bucket" \
 *   AWS_ACCESS_KEY_ID="..." \
 *   AWS_SECRET_ACCESS_KEY="..." \
 *   S3_KEY_PREFIX="korea-erp/dev" \
 *   pnpm --filter @tour/prisma exec tsx prisma/migrate-guides.ts
 *
 * S3 환경변수 없이 실행 시 이미지 업로드를 스킵하고 URL은 null로 저장합니다.
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

interface ParsedGuide {
  nameKo: string;
  nameMn: string;
  level: string;
  status: string;
  gender: string;
  birthYearRaw: string;
  isSmokerRaw: string;
  experienceYearsRaw: string;
  joinYearRaw: string;
  phone: string;
  note: string;
  profileImgSrc: string | null;
  certImgSrcs: string[];
}

function parseHtml(htmlPath: string): ParsedGuide[] {
  const text = readFileSync(htmlPath, 'utf-8');
  const m = text.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead><tbody>([\s\S]*?)<\/tbody>/);
  if (!m) throw new Error('테이블을 찾을 수 없습니다. HTML 파일을 확인해주세요.');
  const [, headHtml, bodyHtml] = m;

  const headers = (headHtml.match(/<th>([\s\S]*?)<\/th>/g) ?? []).map((h) =>
    clean(h.replace(/<\/?th>/g, '')),
  );

  const rows = bodyHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  process.stdout.write(`헤더: ${JSON.stringify(headers)}\n`);
  process.stdout.write(`총 행 수: ${rows.length}\n`);

  const guides: ParsedGuide[] = [];

  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? []).map((c) =>
      c.replace(/<\/?td[^>]*>/g, ''),
    );

    const get = (col: string) => clean(cells[headers.indexOf(col)] ?? '');

    const profileCell = cells[headers.indexOf('프로필사진')] ?? '';
    const certCell = cells[headers.indexOf('자격증 사본')] ?? '';

    const profileImgMatch = profileCell.match(/src="([^"]+)"/);
    const certImgMatches = [...certCell.matchAll(/src="([^"]+)"/g)];

    const decodeSrc = (s: string) => decodeURIComponent(s);

    guides.push({
      nameKo: get('한국이름 (닉네임)'),
      nameMn: get('몽골 이름'),
      level: get('가이드레벨'),
      status: get('상태'),
      gender: get('성별'),
      birthYearRaw: get('출생년도'),
      isSmokerRaw: get('흡연여부'),
      experienceYearsRaw: get('경력 (#년차)'),
      joinYearRaw: get('입사 연도'),
      phone: get('전화번호'),
      note: get('특이사항'),
      profileImgSrc: profileImgMatch ? decodeSrc(profileImgMatch[1]) : null,
      certImgSrcs: certImgMatches.map((m2) => decodeSrc(m2[1])),
    });
  }

  return guides.filter((g) => g.nameKo.length > 0);
}

// ─── enum 매핑 ────────────────────────────────────────────────────────────────

function mapLevel(raw: string): 'MAIN' | 'JUNIOR' | 'ROOKIE' | 'OTHER' {
  const v = raw.toLowerCase();
  if (v.includes('메인') || v.includes('main')) return 'MAIN';
  if (v.includes('주니어') || v.includes('junior')) return 'JUNIOR';
  if (v.includes('신입') || v.includes('rookie')) return 'ROOKIE';
  return 'OTHER';
}

function mapStatus(raw: string): 'ACTIVE_SEASON' | 'INTERVIEW_DONE' | 'INACTIVE' | 'OTHER' {
  const v = raw.toLowerCase();
  if (v.includes('시즌') || v.includes('활동') || v.includes('active')) return 'ACTIVE_SEASON';
  if (v.includes('면접') || v.includes('interview')) return 'INTERVIEW_DONE';
  if (v.includes('대기') || v.includes('휴') || v.includes('inactive')) return 'INACTIVE';
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

function sanitizeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, '_');
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

  const key = `${keyPrefix}guides/${s3KeySuffix}`;
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

function findImageFile(guideDbPath: string, imgSrc: string): string | null {
  const candidate = join(guideDbPath, imgSrc);
  if (existsSync(candidate)) return candidate;
  return null;
}

function findImageByGuideFolder(guideDbPath: string, guideName: string): string | null {
  const folderBase = join(guideDbPath, '가이드', '가이드 개인정보');
  try {
    const entries = readdirSync(folderBase);
    const match = entries.find(
      (e) => e.includes(guideName) || guideName.includes(e.split(' ')[0]),
    );
    if (!match) return null;
    const folder = join(folderBase, match);
    const files = readdirSync(folder).filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
    return files.length > 0 ? join(folder, files[0]) : null;
  } catch {
    return null;
  }
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const guideDbPath =
    process.env.GUIDE_DB_PATH ?? '/Users/luke/Documents/리더스/디비/가이드 db';
  const htmlPath = join(guideDbPath, '가이드 248aa51063d880979b5bc279bf69d809.html');

  process.stdout.write(`\n📄 HTML 파싱 중: ${htmlPath}\n`);
  const guides = parseHtml(htmlPath);
  process.stdout.write(`✅ 총 ${guides.length}명 파싱 완료\n\n`);

  const uploadEnabled =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_REGION &&
    !!process.env.S3_BUCKET;

  if (!uploadEnabled) {
    process.stdout.write(
      '⚠️  S3 환경변수 미설정 → 이미지 업로드 스킵, URL은 null로 저장합니다.\n\n',
    );
  }

  let successCount = 0;
  let errorCount = 0;

  for (const g of guides) {
    process.stdout.write(`👤 ${g.nameKo} (${g.nameMn || '-'})\n`);

    let profileImageUrl: string | null = null;
    const certImageUrls: string[] = [];

    if (uploadEnabled) {
      const profilePath = g.profileImgSrc
        ? findImageFile(guideDbPath, g.profileImgSrc)
        : findImageByGuideFolder(guideDbPath, g.nameKo);

      if (profilePath) {
        try {
          const ext = extname(profilePath).toLowerCase();
          const s3Key = `${sanitizeSegment(g.nameKo)}/profile${ext}`;
          profileImageUrl = await uploadToS3(profilePath, s3Key);
          process.stdout.write(`  📷 프로필: ${profileImageUrl}\n`);
        } catch (err) {
          process.stderr.write(`  ❌ 프로필 업로드 실패: ${err}\n`);
        }
      } else {
        process.stdout.write(`  ℹ️  프로필 이미지 없음\n`);
      }

      for (let i = 0; i < g.certImgSrcs.length; i++) {
        const certPath = findImageFile(guideDbPath, g.certImgSrcs[i]);
        if (certPath) {
          try {
            const ext = extname(certPath).toLowerCase();
            const s3Key = `${sanitizeSegment(g.nameKo)}/cert_${i + 1}${ext}`;
            const url = await uploadToS3(certPath, s3Key);
            certImageUrls.push(url);
            process.stdout.write(`  📄 자격증: ${url}\n`);
          } catch (err) {
            process.stderr.write(`  ❌ 자격증 업로드 실패: ${err}\n`);
          }
        }
      }
    }

    const data = {
      nameKo: g.nameKo,
      nameMn: g.nameMn || null,
      level: mapLevel(g.level),
      status: mapStatus(g.status),
      gender: mapGender(g.gender),
      birthYear: parseBirthYear(g.birthYearRaw),
      isSmoker: g.isSmokerRaw === 'Y',
      experienceYears: parseNumber(g.experienceYearsRaw),
      joinYear: parseNumber(g.joinYearRaw),
      phone: g.phone || null,
      profileImageUrl,
      certImageUrls,
      note: g.note || null,
    };

    try {
      const existing = await prisma.guide.findFirst({ where: { nameKo: g.nameKo } });
      if (existing) {
        await prisma.guide.update({ where: { id: existing.id }, data });
        process.stdout.write(`  ♻️  업데이트 완료\n`);
      } else {
        await prisma.guide.create({ data });
        process.stdout.write(`  ✅ 생성 완료\n`);
      }
      successCount++;
    } catch (err) {
      process.stderr.write(`  ❌ DB 저장 실패 (${g.nameKo}): ${err}\n`);
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
