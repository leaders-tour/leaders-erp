import { createHash, createSign } from 'node:crypto';
import type { ContractDocumentStatusValue, Prisma, PrismaClient } from '@prisma/client';
import {
  normalizeContractDocumentNumber,
  normalizeContractPersonName,
  normalizeContractPhoneDigits,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

interface GoogleAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleSheetMetadata {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

interface GoogleSheetValues {
  values?: string[][];
}

interface ParsedSheetRow {
  rowNumber: number;
  sourceRecordKey: string;
  submittedAt: Date | null;
  documentNumberRaw: string | null;
  documentNumberNorm: string | null;
  travelerName: string | null;
  travelerPhone: string | null;
  travelerPhoneDigits: string | null;
  leaderName: string | null;
  representativeType: string | null;
  totalCompanionCount: number | null;
  receivedStatus: string | null;
  rowDigest: string;
  rawJson: Record<string, string>;
}

interface SyncCounts {
  fetchedRows: number;
  upsertedRows: number;
  skippedRows: number;
}

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function getGooglePrivateKey(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new DomainError('VALIDATION_FAILED', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required');
  }
  return raw.replace(/\\n/g, '\n');
}

async function getGoogleSheetsAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!email) {
    throw new DomainError('VALIDATION_FAILED', 'GOOGLE_SERVICE_ACCOUNT_EMAIL is required');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    base64Url(
      JSON.stringify({
        iss: email,
        scope: GOOGLE_SHEETS_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join('.');

  const signature = createSign('RSA-SHA256').update(unsigned).sign(getGooglePrivateKey());
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = (await response.json()) as GoogleAccessTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new DomainError('VALIDATION_FAILED', data.error_description ?? data.error ?? 'Failed to fetch Google access token');
  }
  return data.access_token;
}

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new DomainError('VALIDATION_FAILED', `Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function resolveSheetTitle(sheetId: string, sheetGid: string, accessToken: string): Promise<string> {
  const metadata = await fetchJson<GoogleSheetMetadata>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties(sheetId,title)`,
    accessToken,
  );
  const targetGid = Number(sheetGid);
  const sheet = metadata.sheets?.find((item) => item.properties?.sheetId === targetGid);
  const title = sheet?.properties?.title;
  if (!title) {
    throw new DomainError('NOT_FOUND', `Google sheet gid ${sheetGid} not found`);
  }
  return title;
}

async function fetchGoogleSheetRows(sheetId: string, sheetGid: string): Promise<string[][]> {
  const accessToken = await getGoogleSheetsAccessToken();
  const title = await resolveSheetTitle(sheetId, sheetGid, accessToken);
  const range = `'${title.replace(/'/g, "''")}'`;
  const data = await fetchJson<GoogleSheetValues>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`,
    accessToken,
  );
  return data.values ?? [];
}

function cell(value: string | undefined): string | null {
  const trimmed = value?.normalize('NFKC').trim() ?? '';
  return trimmed || null;
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseOptionalInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const matched = value.replace(/,/g, '').match(/\d+/);
  if (!matched) {
    return null;
  }
  const parsed = Number(matched[0]);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalizedCandidates = candidates.map(normalizeHeader);
  const exact = normalizedHeaders.findIndex((header) => normalizedCandidates.includes(header));
  if (exact >= 0) {
    return exact;
  }
  return normalizedHeaders.findIndex((header) => normalizedCandidates.some((candidate) => header.includes(candidate)));
}

function requireColumn(headers: string[], candidates: string[], label: string): number {
  const index = findColumn(headers, candidates);
  if (index < 0) {
    throw new DomainError('VALIDATION_FAILED', `Contract sheet is missing required column: ${label}`);
  }
  return index;
}

function optionalColumn(headers: string[], candidates: string[]): number | null {
  const index = findColumn(headers, candidates);
  return index < 0 ? null : index;
}

function rawJsonFromRow(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    const key = header.trim() || `column_${index + 1}`;
    acc[key] = row[index] ?? '';
    return acc;
  }, {});
}

function digestRow(rawJson: Record<string, string>): string {
  return createHash('sha256').update(JSON.stringify(rawJson)).digest('hex');
}

function parseSheetRows(values: string[][], headerRow: number): ParsedSheetRow[] {
  const headerIndex = Math.max(0, headerRow - 1);
  const headers = values[headerIndex]?.map((value) => value.trim()) ?? [];
  if (headers.length === 0) {
    throw new DomainError('VALIDATION_FAILED', 'Contract sheet header row is empty');
  }

  const documentIndex = requireColumn(headers, ['계약서 상 문서번호', '문서번호', 'document number'], '문서번호');
  const travelerIndex = requireColumn(headers, ['여행객 본인 성함', '여행객 성함', '본인 성함', 'traveler name'], '여행객 본인 성함');
  const submittedAtIndex = optionalColumn(headers, ['타임스탬프', 'timestamp', '제출일시']);
  const phoneIndex = optionalColumn(headers, ['전화번호', '연락처', '휴대폰', 'phone']);
  const leaderIndex = optionalColumn(headers, ['여행대표자 성함', '대표자 성함', 'leader name']);
  const representativeIndex = optionalColumn(headers, ['팀별 대표자 여부 구분', '대표자 여부', '대표자구분']);
  const totalCompanionIndex = optionalColumn(headers, ['총 동행 여행객수', '총동행여행객수', '총 인원', '인원']);
  const receivedStatusIndex = optionalColumn(headers, ['서류 수신 여부 확인', '서류수신여부', '수신 여부']);

  return values.slice(headerIndex + 1).flatMap((row, offset) => {
    if (row.every((value) => !value?.trim())) {
      return [];
    }
    const rowNumber = headerIndex + offset + 2;
    const rawJson = rawJsonFromRow(headers, row);
    const documentNumberRaw = cell(row[documentIndex]);
    const travelerName = normalizeContractPersonName(cell(row[travelerIndex]));
    return [{
      rowNumber,
      sourceRecordKey: `row:${rowNumber}`,
      submittedAt: submittedAtIndex == null ? null : parseOptionalDate(cell(row[submittedAtIndex])),
      documentNumberRaw,
      documentNumberNorm: normalizeContractDocumentNumber(documentNumberRaw),
      travelerName,
      travelerPhone: phoneIndex == null ? null : cell(row[phoneIndex]),
      travelerPhoneDigits: phoneIndex == null ? null : normalizeContractPhoneDigits(cell(row[phoneIndex])),
      leaderName: leaderIndex == null ? null : normalizeContractPersonName(cell(row[leaderIndex])),
      representativeType: representativeIndex == null ? null : cell(row[representativeIndex]),
      totalCompanionCount: totalCompanionIndex == null ? null : parseOptionalInteger(cell(row[totalCompanionIndex])),
      receivedStatus: receivedStatusIndex == null ? null : cell(row[receivedStatusIndex]),
      rowDigest: digestRow(rawJson),
      rawJson,
    }];
  });
}

function compactError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function dedupeSubmissionCount(rows: Array<{ travelerName: string | null; travelerPhoneDigits: string | null }>): {
  count: number;
  hasCollision: boolean;
} {
  const seen = new Set<string>();
  let hasCollision = false;
  for (const row of rows) {
    if (!row.travelerName) {
      hasCollision = true;
      continue;
    }
    const key = row.travelerPhoneDigits ? `${row.travelerName}:${row.travelerPhoneDigits}` : `name:${row.travelerName}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
  }
  return { count: seen.size, hasCollision };
}

function resolveStatus(input: {
  submittedCount: number;
  expectedCount: number | null;
  matchedPlanVersionId: string | null;
  hasCollision: boolean;
}): { status: ContractDocumentStatusValue; reason: string | null } {
  if (!input.matchedPlanVersionId) {
    return { status: 'NEEDS_REVIEW', reason: 'NO_MATCHED_PLAN_VERSION' };
  }
  if (input.expectedCount == null || input.expectedCount <= 0) {
    return { status: 'NEEDS_REVIEW', reason: 'MISSING_EXPECTED_COUNT' };
  }
  if (input.hasCollision) {
    return { status: 'NEEDS_REVIEW', reason: 'DEDUPLICATION_REVIEW_REQUIRED' };
  }
  if (input.submittedCount === 0) {
    return { status: 'NOT_STARTED', reason: null };
  }
  if (input.submittedCount < input.expectedCount) {
    return { status: 'IN_PROGRESS', reason: null };
  }
  if (input.submittedCount === input.expectedCount) {
    return { status: 'COMPLETED', reason: null };
  }
  return { status: 'OVER_SUBMITTED', reason: null };
}

export class ContractSyncService {
  constructor(private readonly prisma: PrismaLike) {}

  listSources() {
    return this.prisma.contractSubmissionSource.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async listStatuses(documentNumbers: string[]) {
    const normalized = Array.from(new Set(documentNumbers.map(normalizeContractDocumentNumber).filter(isPresent)));
    if (normalized.length === 0) {
      return [];
    }
    const rows = await this.prisma.contractDocumentStatus.findMany({
      where: { documentNumberNorm: { in: normalized } },
    });
    const byNorm = new Map(rows.map((row) => [row.documentNumberNorm, row]));
    return normalized.map((documentNumberNorm) => byNorm.get(documentNumberNorm) ?? {
      id: `synthetic:${documentNumberNorm}`,
      documentNumberNorm,
      documentNumberRawSample: null,
      expectedCount: null,
      submittedCount: 0,
      status: 'NOT_STARTED' as ContractDocumentStatusValue,
      needsReviewReason: null,
      firstSubmittedAt: null,
      lastSubmittedAt: null,
      matchedPlanVersionId: null,
      matchedConfirmedTripId: null,
      computedAt: new Date(0),
      updatedAt: new Date(0),
    });
  }

  listSyncRuns(sourceId: string | undefined, limit: number) {
    return this.prisma.contractSyncRun.findMany({
      where: sourceId ? { sourceId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async syncGoogleSheetSource(sourceId: string) {
    const run = await this.prisma.contractSyncRun.create({
      data: { sourceId, status: 'RUNNING' },
    });

    try {
      const counts = await this.processGoogleSheetSource(sourceId);
      const updated = await this.prisma.contractSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          fetchedRows: counts.fetchedRows,
          upsertedRows: counts.upsertedRows,
          skippedRows: counts.skippedRows,
        },
      });
      return updated;
    } catch (error) {
      await this.prisma.contractSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: compactError(error),
        },
      });
      throw error;
    }
  }

  private async processGoogleSheetSource(sourceId: string): Promise<SyncCounts> {
    const source = await this.prisma.contractSubmissionSource.findUnique({ where: { id: sourceId } });
    if (!source) {
      throw new DomainError('NOT_FOUND', 'Contract submission source not found');
    }
    if (source.type !== 'GOOGLE_SHEET') {
      throw new DomainError('VALIDATION_FAILED', 'Contract submission source is not a Google Sheet');
    }
    const sheetId = source.sheetId ?? process.env.CONTRACT_FORM_SHEET_ID?.trim();
    const sheetGid = source.sheetGid ?? process.env.CONTRACT_FORM_SHEET_GID?.trim() ?? '0';
    if (!sheetId) {
      throw new DomainError('VALIDATION_FAILED', 'Contract form sheet id is required');
    }

    const rows = parseSheetRows(await fetchGoogleSheetRows(sheetId, sheetGid), source.headerRow ?? 1);
    const existingRows = await this.prisma.contractSubmission.findMany({
      where: {
        sourceId,
        sourceRecordKey: { in: rows.map((row) => row.sourceRecordKey) },
      },
      select: { sourceRecordKey: true, rowDigest: true },
    });
    const existingDigestByKey = new Map(existingRows.map((row) => [row.sourceRecordKey, row.rowDigest]));

    let upsertedRows = 0;
    let skippedRows = 0;
    const affectedDocumentNumbers = new Set<string>();

    for (const row of rows) {
      if (row.documentNumberNorm) {
        affectedDocumentNumbers.add(row.documentNumberNorm);
      }
      if (existingDigestByKey.get(row.sourceRecordKey) === row.rowDigest) {
        skippedRows += 1;
        continue;
      }

      await this.prisma.contractSubmission.upsert({
        where: {
          sourceId_sourceRecordKey: {
            sourceId,
            sourceRecordKey: row.sourceRecordKey,
          },
        },
        create: {
          sourceId,
          sourceRowNumber: row.rowNumber,
          sourceRecordKey: row.sourceRecordKey,
          submittedAt: row.submittedAt,
          documentNumberRaw: row.documentNumberRaw,
          documentNumberNorm: row.documentNumberNorm,
          travelerName: row.travelerName,
          travelerPhone: row.travelerPhone,
          travelerPhoneDigits: row.travelerPhoneDigits,
          leaderName: row.leaderName,
          representativeType: row.representativeType,
          totalCompanionCount: row.totalCompanionCount,
          receivedStatus: row.receivedStatus,
          rowDigest: row.rowDigest,
          rawJson: row.rawJson,
        },
        update: {
          sourceRowNumber: row.rowNumber,
          submittedAt: row.submittedAt,
          documentNumberRaw: row.documentNumberRaw,
          documentNumberNorm: row.documentNumberNorm,
          travelerName: row.travelerName,
          travelerPhone: row.travelerPhone,
          travelerPhoneDigits: row.travelerPhoneDigits,
          leaderName: row.leaderName,
          representativeType: row.representativeType,
          totalCompanionCount: row.totalCompanionCount,
          receivedStatus: row.receivedStatus,
          rowDigest: row.rowDigest,
          rawJson: row.rawJson,
        },
      });
      upsertedRows += 1;
    }

    await this.recomputeDocumentStatuses([...affectedDocumentNumbers]);

    return {
      fetchedRows: rows.length,
      upsertedRows,
      skippedRows,
    };
  }

  async recomputeDocumentStatuses(documentNumbers?: string[]) {
    const normalized = documentNumbers?.length
      ? Array.from(new Set(documentNumbers.map(normalizeContractDocumentNumber).filter(isPresent)))
      : (await this.prisma.contractSubmission.findMany({
          where: { documentNumberNorm: { not: null } },
          distinct: ['documentNumberNorm'],
          select: { documentNumberNorm: true },
        })).map((row) => row.documentNumberNorm).filter(isPresent);

    for (const documentNumberNorm of normalized) {
      await this.recomputeDocumentStatus(documentNumberNorm);
    }
  }

  private async recomputeDocumentStatus(documentNumberNorm: string) {
    const submissions = await this.prisma.contractSubmission.findMany({
      where: { documentNumberNorm },
      orderBy: [{ submittedAt: 'asc' }, { importedAt: 'asc' }],
    });
    if (submissions.length === 0) {
      return;
    }

    const metas = await this.prisma.planVersionMeta.findMany({
      select: {
        planVersionId: true,
        documentNumber: true,
        headcountTotal: true,
        planVersion: {
          select: {
            confirmedTrips: {
              where: { status: 'ACTIVE' },
              select: { id: true, paxCount: true },
              take: 1,
            },
          },
        },
      },
    });
    const matchedMeta = metas.find((meta) => normalizeContractDocumentNumber(meta.documentNumber) === documentNumberNorm) ?? null;
    const matchedTrip = matchedMeta?.planVersion.confirmedTrips[0] ?? null;
    const fallbackCount = submissions.find((row) => row.totalCompanionCount != null)?.totalCompanionCount ?? null;
    const expectedCount = matchedMeta?.headcountTotal ?? matchedTrip?.paxCount ?? fallbackCount;
    const { count: submittedCount, hasCollision } = dedupeSubmissionCount(submissions);
    const status = resolveStatus({
      submittedCount,
      expectedCount,
      matchedPlanVersionId: matchedMeta?.planVersionId ?? null,
      hasCollision,
    });

    await this.prisma.contractDocumentStatus.upsert({
      where: { documentNumberNorm },
      create: {
        documentNumberNorm,
        documentNumberRawSample: submissions.find((row) => row.documentNumberRaw)?.documentNumberRaw ?? null,
        expectedCount,
        submittedCount,
        status: status.status,
        needsReviewReason: status.reason,
        firstSubmittedAt: submissions.find((row) => row.submittedAt)?.submittedAt ?? null,
        lastSubmittedAt: submissions.slice().reverse().find((row) => row.submittedAt)?.submittedAt ?? null,
        matchedPlanVersionId: matchedMeta?.planVersionId ?? null,
        matchedConfirmedTripId: matchedTrip?.id ?? null,
        computedAt: new Date(),
      },
      update: {
        documentNumberRawSample: submissions.find((row) => row.documentNumberRaw)?.documentNumberRaw ?? null,
        expectedCount,
        submittedCount,
        status: status.status,
        needsReviewReason: status.reason,
        firstSubmittedAt: submissions.find((row) => row.submittedAt)?.submittedAt ?? null,
        lastSubmittedAt: submissions.slice().reverse().find((row) => row.submittedAt)?.submittedAt ?? null,
        matchedPlanVersionId: matchedMeta?.planVersionId ?? null,
        matchedConfirmedTripId: matchedTrip?.id ?? null,
        computedAt: new Date(),
      },
    });
  }
}
