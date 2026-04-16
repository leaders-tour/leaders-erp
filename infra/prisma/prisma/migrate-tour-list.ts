/**
 * 투어 리스트 마이그레이션 스크립트
 * Notion 투어 리스트 HTML → ERP ConfirmedTrip
 *
 * 실행: npx ts-node --project tsconfig.json migrate-tour-list.ts
 * (또는) npx tsx migrate-tour-list.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const HTML_PATH = path.resolve(
  '/Users/luke/Documents/리더스/디비/user db/투어 리스트 104aa51063d880f5b6b9c6304d66fa6d.html',
);

const prisma = new PrismaClient();

// ── 유틸 ──────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/** 이모지 및 앞뒤 공백 제거 */
function stripEmoji(str: string): string {
  // Unicode emoji ranges + variation selectors + ZWJ sequences
  return str
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]+/gu,
      '',
    )
    .trim();
}

/**
 * 괄호 안의 코드(예: (C06), (C100))도 제거하여 순수 이름만 추출.
 * 단, 한글 이름 앞의 이모지/공백만 제거.
 */
function parseName(raw: string): string {
  let name = stripEmoji(raw);
  // 괄호 표현식 제거: e.g. "(C06)", "(C100)"
  name = name.replace(/\([^)]*\)/g, '').trim();
  return name;
}

/**
 * 날짜 문자열 파싱: "2026/04/19 → 2026/04/25"
 * → { start: Date, end: Date }
 */
function parseDate(raw: string): { start: Date | null; end: Date | null } {
  const match = raw.match(/(\d{4}\/\d{2}\/\d{2})\s*→\s*(\d{4}\/\d{2}\/\d{2})/);
  if (!match) return { start: null, end: null };
  const toDate = (s: string) => new Date(s.replace(/\//g, '-') + 'T00:00:00.000Z');
  return { start: toDate(match[1]), end: toDate(match[2]) };
}

/**
 * 숙소 문자열 파싱: 줄바꿈이나 공백으로 구분된 숙소 이름들
 * (노션 export에서는 텍스트 그대로)
 */
function parseAccommodations(raw: string): string[] {
  if (!raw) return [];
  // 줄바꿈 없이 연속 텍스트이므로, 대문자 시작 패턴으로 분리를 시도하지 않고
  // 그대로 쉼표 없이 사용. 노션 텍스트는 이미 연결된 문자열임.
  // 실제로는 각 숙소명이 붙어있음 → 그대로 저장
  return [raw.trim()].filter(Boolean);
}

function isChecked(html: string): boolean {
  return html.includes('checkbox-on');
}

// ── 행 파싱 ──────────────────────────────────────────────────────

interface TourRow {
  rawName: string;
  name: string;
  travelStart: Date | null;
  travelEnd: Date | null;
  destination: string;
  paxCount: number | null;
  guideName: string;
  driverName: string;
  vehicle: string;
  accommodationRaw: string;
  rentalGear: boolean;
  rentalDrone: boolean;
  rentalStarlink: boolean;
  rentalPowerbank: boolean;
}

function parseRows(html: string): TourRow[] {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) throw new Error('tbody not found');

  const rowMatches = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const rows: TourRow[] = [];

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1];
    const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    if (tdMatches.length < 14) continue;

    const tds = tdMatches.map((m) => m[1]);

    const rawName = stripTags(tds[0]);
    const name = parseName(rawName);
    if (!name) continue; // 이름 없는 행 스킵

    const dateStr = stripTags(tds[1]);
    const { start: travelStart, end: travelEnd } = parseDate(dateStr);

    const destination = stripTags(tds[3]).trim();
    const paxRaw = stripTags(tds[4]).trim();
    const paxCount = paxRaw ? parseInt(paxRaw, 10) || null : null;

    const guideName = stripTags(tds[6]).trim();
    const driverName = stripTags(tds[7]).trim();
    const vehicle = stripTags(tds[8]).trim();
    const accommodationRaw = stripTags(tds[9]).trim();

    const rentalGear = isChecked(tds[10]);
    const rentalDrone = isChecked(tds[11]);
    const rentalStarlink = isChecked(tds[12]);
    const rentalPowerbank = isChecked(tds[13]);

    rows.push({
      rawName,
      name,
      travelStart,
      travelEnd,
      destination,
      paxCount,
      guideName,
      driverName,
      vehicle,
      accommodationRaw,
      rentalGear,
      rentalDrone,
      rentalStarlink,
      rentalPowerbank,
    });
  }

  return rows;
}

// ── 메인 ─────────────────────────────────────────────────────────

async function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const rows = parseRows(html);
  console.log(`파싱된 행 수: ${rows.length}`);

  let createdUsers = 0;
  let createdGuides = 0;
  let createdDrivers = 0;
  let createdTrips = 0;
  let skipped = 0;

  for (const row of rows) {
    console.log(`\n처리 중: ${row.rawName} → ${row.name}`);

    // 1) User 신규 생성
    const user = await prisma.user.create({
      data: {
        name: row.name,
        dealStage: 'CONTRACT_CONFIRMED',
      },
    });
    createdUsers++;

    // 2) Guide 검색 → 없으면 생성
    let guideId: string | null = null;
    if (row.guideName) {
      let guide = await prisma.guide.findFirst({
        where: {
          OR: [
            { nameMn: row.guideName },
            { nameKo: row.guideName },
          ],
        },
      });
      if (!guide) {
        guide = await prisma.guide.create({
          data: {
            nameKo: row.guideName,
            nameMn: row.guideName,
          },
        });
        createdGuides++;
        console.log(`  가이드 신규 생성: ${row.guideName}`);
      } else {
        console.log(`  가이드 기존 사용: ${guide.nameKo} (${guide.id})`);
      }
      guideId = guide.id;
    }

    // 3) Driver 검색 → 없으면 생성
    let driverId: string | null = null;
    if (row.driverName) {
      let driver = await prisma.driver.findFirst({
        where: {
          nameMn: row.driverName,
        },
      });
      if (!driver) {
        driver = await prisma.driver.create({
          data: {
            nameMn: row.driverName,
          },
        });
        createdDrivers++;
        console.log(`  기사 신규 생성: ${row.driverName}`);
      } else {
        console.log(`  기사 기존 사용: ${driver.nameMn} (${driver.id})`);
      }
      driverId = driver.id;
    }

    // 4) ConfirmedTrip 생성
    await prisma.confirmedTrip.create({
      data: {
        userId: user.id,
        planId: null,
        planVersionId: null,
        travelStart: row.travelStart,
        travelEnd: row.travelEnd,
        destination: row.destination || null,
        paxCount: row.paxCount,
        guideId,
        driverId,
        guideName: row.guideName || null,
        driverName: row.driverName || null,
        assignedVehicle: row.vehicle || null,
        accommodationNote: row.accommodationRaw || null,
        rentalGear: row.rentalGear,
        rentalDrone: row.rentalDrone,
        rentalStarlink: row.rentalStarlink,
        rentalPowerbank: row.rentalPowerbank,
      },
    });
    createdTrips++;
  }

  console.log('\n=== 마이그레이션 완료 ===');
  console.log(`생성된 User:         ${createdUsers}`);
  console.log(`생성된 Guide (신규): ${createdGuides}`);
  console.log(`생성된 Driver (신규): ${createdDrivers}`);
  console.log(`생성된 ConfirmedTrip: ${createdTrips}`);
  console.log(`스킵:                ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
