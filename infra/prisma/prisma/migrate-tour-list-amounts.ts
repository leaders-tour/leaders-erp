/**
 * 투어 리스트 금액 마이그레이션 스크립트
 * 노션 금액 HTML → ConfirmedTrip 금액 필드 업데이트
 *
 * 실행: npx tsx prisma/migrate-tour-list-amounts.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const HTML_PATH = path.resolve(
  '/Users/luke/Documents/리더스/디비/user2 db/페이지 321d3b76738880dc848eccf1ec82b657.html',
);

const prisma = new PrismaClient();

// ── 유틸 ──────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function stripEmoji(str: string): string {
  return str
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]+/gu,
      '',
    )
    .trim();
}

function parseName(raw: string): string {
  let name = stripEmoji(raw);
  name = name.replace(/\([^)]*\)/g, '').trim();
  return name;
}

function parseDate(raw: string): Date | null {
  const match = raw.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (!match) return null;
  return new Date(match[1].replace(/\//g, '-') + 'T00:00:00.000Z');
}

/**
 * 금액 파싱
 * - "₩81,000"     → 81000
 * - "₩1,630,000"  → 1630000
 * - "300,000원"   → 300000
 * - "120000원"    → 120000
 * - "6844000"     → 6844000
 * - ""            → null
 */
function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return isNaN(n) ? null : n;
}

// ── 행 파싱 ──────────────────────────────────────────────────────

interface AmountRow {
  rawName: string;
  name: string;
  travelStart: Date | null;
  deposit: number | null;
  balance: number | null;
  total: number | null;
  securityDeposit: number | null;
  groupTotal: number | null;
}

function parseRows(html: string): AmountRow[] {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) throw new Error('tbody not found');

  const rowMatches = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const rows: AmountRow[] = [];

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1];
    const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    if (tdMatches.length < 23) continue;

    const tds = tdMatches.map((m) => m[1]);

    const rawName = stripTags(tds[0]);
    const name = parseName(rawName);
    if (!name) continue;

    const travelStart = parseDate(stripTags(tds[1]));

    rows.push({
      rawName,
      name,
      travelStart,
      deposit: parseAmount(stripTags(tds[18])),
      balance: parseAmount(stripTags(tds[19])),
      total: parseAmount(stripTags(tds[20])),
      securityDeposit: parseAmount(stripTags(tds[21])),
      groupTotal: parseAmount(stripTags(tds[22])),
    });
  }

  return rows;
}

// ── 메인 ─────────────────────────────────────────────────────────

async function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const rows = parseRows(html);
  console.log(`파싱된 행 수: ${rows.length}`);

  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    console.log(`\n처리 중: ${row.rawName} → ${row.name}`);

    const trip = await prisma.confirmedTrip.findFirst({
      where: {
        user: { name: row.name },
        travelStart: row.travelStart ?? undefined,
      },
      select: { id: true },
    });

    if (!trip) {
      console.warn(`  ⚠️  미매칭 스킵: ${row.name} (${row.travelStart?.toISOString().slice(0, 10)})`);
      notFound++;
      continue;
    }

    await prisma.confirmedTrip.update({
      where: { id: trip.id },
      data: {
        depositAmountKrw: row.deposit,
        balanceAmountKrw: row.balance,
        totalAmountKrw: row.total,
        securityDepositAmountKrw: row.securityDeposit,
        groupTotalAmountKrw: row.groupTotal,
      },
    });

    console.log(
      `  예약금 ${row.deposit?.toLocaleString()} | 잔금 ${row.balance?.toLocaleString()} | 총액 ${row.total?.toLocaleString()} | 보증금 ${row.securityDeposit?.toLocaleString()} | 팀별총액 ${row.groupTotal?.toLocaleString()}`,
    );
    updated++;
  }

  console.log('\n=== 금액 마이그레이션 완료 ===');
  console.log(`업데이트 성공: ${updated}`);
  console.log(`미매칭 스킵:  ${notFound}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
